// =============================================================
// Vakio OpenAir Rev2 — драйвер для Wiren Board / wb-rules 2.0
// Основан на официальном API: github.com/vakio-ru/vakio-public-api
// Протокол: JSON MQTT (прошивка >= 1.1.0, exchange_type: json)
// =============================================================
//
// ТОПИКИ ОТ УСТРОЙСТВА (device/+/openair/...):
//   system → auth{device_mac, version}, device_subtype{exchange_type,series,subtype,xtal_freq}
//            errors{shutdown}
//   mode   → capabilities{mode,on_off,speed,gate}
//            settings{temperature_speed[temp,speed], emerg_shunt, gate, smart_speed}
//   +/temp, +/hud, +/state, +/speed, +/gate, +/workmode (легаси-топики)
//
// ТОПИКИ К УСТРОЙСТВУ (server/+/openair/...):
//   system → {"type":"auth"} | {"shutdown":{"limit":N}} | {"firmware":{...}} | {"reset":[...]}
//   mode   → {"capabilities":{mode,on_off,speed,gate}}
//            {"settings":{gate,smart_speed,emerg_shunt,temperature_speed:[temp,speed]}}
//
// =============================================================
// УПРАВЛЕНИЕ РЕЖИМОМ
// =============================================================
// Поле "Workmode" — редактируемое текстовое поле.
//   manual     — ручной режим
//   super_auto — смарт-режим
//
// =============================================================
// ИНТЕРЛОК заслонки и скорости
// =============================================================
// Speed = 0 → стоп → заслонка в позицию 2 (через 1.5с)
// Speed > 0 → заслонка в 4 (через 1.5с) → скорость + вкл
// Ручное изменение Gate → стоп → переход заслонки (через 1.5с)
// CloseGate → speed=0 → off (через 1.5с)
//
// =============================================================
// ОБНОВЛЕНИЕ ДАННЫХ
// =============================================================
// Контрол "ForceRefresh" (pushbutton) — принудительно запросить
// состояние устройства (auth + эхо текущих capabilities).
// Автоматически выполняется каждые deep_poll_interval секунд.
//
// =============================================================
// ОТЛАДОЧНЫЙ ЛОГ
// =============================================================
// Контрол "Debug_Log" (switch) — включить/выключить детальный лог
// Смотреть: journalctl -u wb-rules -f
// =============================================================

createVakioOpenAir({
  id: 1,
  topic: "VAKIO",
  endpoint: "openair",
  polling_interval: 10, // интервал heartbeat (сек)
  deep_poll_interval: 300, // интервал глубокого опроса (сек), по умолчанию 5 минут
});

function createVakioOpenAir(params) {
  var id = params.id;
  var topic = params.topic;
  var endpoint = params.endpoint !== undefined ? params.endpoint : "openair";
  var polling_interval =
    params.polling_interval !== undefined ? params.polling_interval : 10;
  var deep_poll_interval =
    params.deep_poll_interval !== undefined ? params.deep_poll_interval : 300;

  var vd = "Vakio_" + id + "_" + endpoint;

  // ============================================================
  // Имена контролов
  // ============================================================
  var ctrlState = "State";
  var ctrlWorkmode = "Workmode";
  var ctrlSpeed = "Speed";
  var ctrlGate = "Gate";
  var ctrlClose = "CloseGate";
  var ctrlForceRefresh = "ForceRefresh";

  var ctrlConnect = "Connect";
  var ctrlTemp = "Temperature";
  var ctrlHumidity = "Humidity";
  var ctrlErrShutdown = "Err_Shutdown";

  // Настройки смарт — то что ОТПРАВЛЯЕМ на устройство
  var ctrlSmartGate = "Smart_Gate"; // gate в smart (позиция заслонки)
  var ctrlSmartSpeed = "Smart_Speed"; // smart_speed
  var ctrlEmergShunt = "Emerg_Shunt"; // emerg_shunt (темп. отключения клапана)
  var ctrlSmartTempThreshold = "Smart_Temp"; // temperature_speed[0] — порог температуры
  var ctrlShutdownLimit = "Shutdown_Limit";

  // Readonly — что ПОЛУЧАЕМ из settings устройства (feedback)
  var ctrlAutoTemp = "Auto_Temp"; // temperature_speed[0]
  var ctrlAutoSpeed = "Auto_Speed"; // temperature_speed[1]
  var ctrlRelGate = "Rel_Gate"; // settings.gate (feedback)
  var ctrlRelSmartSpd = "Rel_SmartSpeed"; // settings.smart_speed (feedback)
  var ctrlRelEmerg = "Rel_EmergShunt"; // settings.emerg_shunt (feedback)

  // Информация об устройстве (readonly)
  var ctrlFwVer = "FW_Version";
  var ctrlMac = "Device_MAC";
  var ctrlSeries = "HW_Series";
  var ctrlSubtype = "HW_Subtype";
  var ctrlExchange = "Exchange";

  var ctrlDebugLog = "Debug_Log";

  // ============================================================
  // MQTT пути
  // ============================================================
  var deviceBase = "device/" + topic + "/" + endpoint;
  var serverBase = "server/" + topic + "/" + endpoint;
  var legacyBase = topic;

  // ============================================================
  // Внутреннее состояние
  // ============================================================
  var _selfChange = false;
  var _initialized = false;
  var _lastAlive = 0;
  var _isOnline = false;
  var _deepPollTick = 0;

  // ============================================================
  // Виртуальное устройство
  // ============================================================
  defineVirtualDevice(vd, {
    title: "Vakio OpenAir [" + topic + "/" + endpoint + "]",
    cells: {
      // --- Основное управление ---
      State: {
        title: "Вкл / Выкл",
        type: "switch",
        value: false,
        order: 1,
      },
      Workmode: {
        title: "Режим (manual / super_auto)",
        type: "text",
        value: "manual",
        readonly: false,
        order: 2,
      },
      Speed: {
        title: "Скорость (0=стоп, 1-5)",
        type: "range",
        value: 0,
        min: 0,
        max: 5,
        order: 3,
      },
      Gate: {
        title: "Заслонка (1=мин, 4=макс)",
        type: "range",
        value: 2,
        min: 1,
        max: 4,
        order: 4,
      },
      CloseGate: {
        title: "Стоп + закрыть",
        type: "pushbutton",
        value: false,
        order: 5,
      },
      ForceRefresh: {
        title: "Обновить данные с устройства",
        type: "pushbutton",
        value: false,
        order: 6,
      },

      // --- Статус ---
      Connect: {
        title: "Связь",
        type: "switch",
        value: false,
        readonly: true,
        order: 10,
      },
      Temperature: {
        title: "Температура (°C)",
        type: "temperature",
        value: 0,
        readonly: true,
        order: 11,
      },
      Humidity: {
        title: "Влажность (%)",
        type: "rel_humidity",
        value: 0,
        readonly: true,
        order: 12,
      },
      Err_Shutdown: {
        title: "Ошибка: переохлаждение",
        type: "switch",
        value: false,
        readonly: true,
        order: 13,
      },

      // --- Настройки смарт-режима (ЗАПИСЫВАЕМЫЕ) ---
      // Smart_Gate:  позиция заслонки в smart режиме → settings.gate
      // Smart_Speed: скорость в smart режиме         → settings.smart_speed
      // Smart_Temp:  порог температуры               → settings.temperature_speed[0]
      // Emerg_Shunt: темп. отключения клапана        → settings.emerg_shunt
      Smart_Gate: {
        title: "Смарт: заслонка (1-4)",
        type: "range",
        value: 4,
        min: 1,
        max: 4,
        order: 20,
      },
      Smart_Speed: {
        title: "Смарт: скорость (1-5)",
        type: "range",
        value: 3,
        min: 1,
        max: 5,
        order: 21,
      },
      Smart_Temp: {
        title: "Смарт: порог температуры (°C)",
        type: "range",
        value: 20,
        min: -20,
        max: 40,
        order: 22,
      },
      Emerg_Shunt: {
        title: "Смарт: темп. откл. клапана (°C)",
        type: "range",
        value: 10,
        min: -20,
        max: 25,
        order: 23,
      },
      Shutdown_Limit: {
        title: "Порог переохлаждения (°C)",
        type: "range",
        value: 0,
        min: -30,
        max: 25,
        order: 24,
      },

      // --- Авто-режим (readonly, feedback из settings) ---
      Auto_Temp: {
        title: "Авто: порог темп. (°C) [feedback]",
        type: "value",
        value: 0,
        readonly: true,
        order: 30,
      },
      Auto_Speed: {
        title: "Авто: скорость [feedback]",
        type: "value",
        value: 0,
        readonly: true,
        order: 31,
      },

      // --- Информация об устройстве (readonly) ---
      FW_Version: {
        title: "Прошивка",
        type: "text",
        value: "—",
        readonly: true,
        order: 40,
      },
      Device_MAC: {
        title: "MAC адрес",
        type: "text",
        value: "—",
        readonly: true,
        order: 41,
      },
      HW_Series: {
        title: "Серия железа",
        type: "text",
        value: "—",
        readonly: true,
        order: 42,
      },
      HW_Subtype: {
        title: "Подтип железа",
        type: "text",
        value: "—",
        readonly: true,
        order: 43,
      },
      Exchange: {
        title: "Протокол обмена",
        type: "text",
        value: "—",
        readonly: true,
        order: 44,
      },

      // --- Rel (readonly, feedback) ---
      Rel_Gate: {
        title: "Rel: заслонка [feedback]",
        type: "value",
        value: 0,
        readonly: true,
        order: 50,
      },
      Rel_SmartSpeed: {
        title: "Rel: скорость смарт [feedback]",
        type: "value",
        value: 0,
        readonly: true,
        order: 51,
      },
      Rel_EmergShunt: {
        title: "Rel: emerg_shunt [feedback]",
        type: "value",
        value: 0,
        readonly: true,
        order: 52,
      },

      // --- Отладка ---
      Debug_Log: {
        title: "Детальный лог (Debug)",
        type: "switch",
        value: false,
        order: 60,
      },
    },
  });

  // ============================================================
  // Вспомогательные функции
  // ============================================================

  function dbg(tag, message) {
    if (dev[vd][ctrlDebugLog]) {
      log.info("[DBG][" + vd + "][" + tag + "] " + message);
    }
  }

  function sendCapabilities(caps) {
    var payload = JSON.stringify({ capabilities: caps });
    publish(serverBase + "/mode", payload, 2, false);
    dbg("TX/mode", "capabilities: " + payload);
  }

  function sendSettings(s) {
    var payload = JSON.stringify({ settings: s });
    publish(serverBase + "/mode", payload, 2, false);
    dbg("TX/mode", "settings: " + payload);
  }

  function sendSystem(obj) {
    var payload = JSON.stringify(obj);
    publish(serverBase + "/system", payload, 2, false);
    dbg("TX/system", payload);
  }

  function setCtrlError(ctrl, isError) {
    dev[vd + "/" + ctrl + "#error"] = isError ? "r" : "";
  }

  var watchedCtrls = [ctrlState, ctrlSpeed, ctrlGate];

  function setOnline() {
    _lastAlive = Date.now();
    if (!_isOnline) {
      _isOnline = true;
      dev[vd][ctrlConnect] = true;
      for (var i = 0; i < watchedCtrls.length; i++) {
        setCtrlError(watchedCtrls[i], false);
      }
      log.info("[" + vd + "] онлайн");
    }
  }

  function setOffline() {
    if (_isOnline) {
      _isOnline = false;
      dev[vd][ctrlConnect] = false;
      for (var i = 0; i < watchedCtrls.length; i++) {
        setCtrlError(watchedCtrls[i], true);
      }
      log.warning("[" + vd + "] офлайн");
    }
  }

  function safeJson(str) {
    try {
      return JSON.parse(str);
    } catch (e) {
      log.warning("[" + vd + "] ошибка JSON: " + str);
      return null;
    }
  }

  // ============================================================
  // Глубокий опрос — только запрос auth + 0687
  //
  // ВАЖНО: НЕ эхоим capabilities обратно на устройство!
  // Если эхоить — устройство применяет значения и присылает feedback,
  // перезатирая реальное состояние после интерлока (speed=0 при смене gate).
  //
  // Устройство само присылает актуальное состояние в ответ на auth:
  //   device/.../system → auth + device_subtype (mac, fw, серия)
  //   device/.../mode   → capabilities + settings (скорость, заслонка, режим)
  // ============================================================
  function deepPoll() {
    // Запрос system → устройство ответит mac, fw, subtype
    sendSystem({ type: "auth" });
    // Легаси heartbeat → устройство ответит текущим состоянием
    publish(legacyBase + "/system", "0687", 2, false);
    dbg("DEEP_POLL", "auth + 0687 отправлены, ждём ответа от устройства");
    log.info("[" + vd + "] глубокий опрос выполнен");
  }

  // ============================================================
  // Команды пользователя → Устройство
  // ============================================================

  // --- Вкл/Выкл ---
  trackMqtt(
    "/devices/" + vd + "/controls/" + ctrlState + "/on",
    function (msg) {
      var isOn =
        msg.value === true || msg.value === "true" || msg.value === "1";
      sendCapabilities({ on_off: isOn ? "on" : "off" });
    },
  );

  // --- Режим ---
  trackMqtt(
    "/devices/" + vd + "/controls/" + ctrlWorkmode + "/on",
    function (msg) {
      var mode = String(msg.value).trim();
      log.info("[" + vd + "] режим → " + mode);
      sendCapabilities({ mode: mode });
    },
  );

  // --- Скорость с интерлоком ---
  trackMqtt(
    "/devices/" + vd + "/controls/" + ctrlSpeed + "/on",
    function (msg) {
      var newSpeed = parseInt(msg.value, 10);
      _selfChange = true;

      if (newSpeed === 0) {
        sendCapabilities({ speed: 0 });
        setTimeout(function () {
          sendCapabilities({ gate: 2 });
          _selfChange = false;
        }, 1500);
      } else {
        sendCapabilities({ gate: 4 });
        setTimeout(function () {
          sendCapabilities({ speed: newSpeed, on_off: "on" });
          _selfChange = false;
        }, 1500);
      }
    },
  );

  // --- Заслонка с интерлоком ---
  trackMqtt("/devices/" + vd + "/controls/" + ctrlGate + "/on", function (msg) {
    if (_selfChange) {
      return;
    }
    var newGate = parseInt(msg.value, 10);
    _selfChange = true;

    sendCapabilities({ speed: 0 });
    setTimeout(function () {
      sendCapabilities({ gate: newGate });
      _selfChange = false;
    }, 1500);
  });

  // --- CloseGate: стоп → выкл ---
  defineRule("CloseGate_" + vd, {
    whenChanged: vd + "/" + ctrlClose,
    then: function (newValue) {
      if (!newValue) {
        return;
      }
      sendCapabilities({ speed: 0 });
      setTimeout(function () {
        sendCapabilities({ on_off: "off" });
      }, 1500);
    },
  });

  // --- ForceRefresh ---
  defineRule("ForceRefresh_" + vd, {
    whenChanged: vd + "/" + ctrlForceRefresh,
    then: function (newValue) {
      if (!newValue) {
        return;
      }
      log.info("[" + vd + "] принудительное обновление данных...");
      deepPoll();
    },
  });

  // --- Настройки смарт: gate + smart_speed + emerg_shunt ---
  defineRule("SmartSettings_" + vd, {
    whenChanged: [
      vd + "/" + ctrlSmartGate,
      vd + "/" + ctrlSmartSpeed,
      vd + "/" + ctrlEmergShunt,
    ],
    then: function () {
      var s = {
        gate: dev[vd][ctrlSmartGate],
        smart_speed: dev[vd][ctrlSmartSpeed],
        emerg_shunt: dev[vd][ctrlEmergShunt],
      };
      sendSettings(s);
      log.info(
        "[" +
          vd +
          "] настройки смарт → gate=" +
          s.gate +
          " speed=" +
          s.smart_speed +
          " emerg=" +
          s.emerg_shunt,
      );
    },
  });

  // --- Настройки смарт: temperature_speed (порог + скорость) ---
  // Отправляем вместе: [порог_температуры, скорость_в_smart]
  defineRule("SmartTempSpeed_" + vd, {
    whenChanged: vd + "/" + ctrlSmartTempThreshold,
    then: function () {
      var threshold = parseFloat(dev[vd][ctrlSmartTempThreshold]);
      var speed = parseInt(dev[vd][ctrlSmartSpeed], 10);
      var s = {
        temperature_speed: [threshold, speed],
      };
      sendSettings(s);
      log.info(
        "[" + vd + "] temperature_speed → " + threshold + "°C / speed=" + speed,
      );
    },
  });

  // --- Порог переохлаждения ---
  defineRule("ShutdownLimit_" + vd, {
    whenChanged: vd + "/" + ctrlShutdownLimit,
    then: function () {
      sendSystem({ shutdown: { limit: dev[vd][ctrlShutdownLimit] } });
    },
  });

  // ============================================================
  // Обратная связь Устройство → Wiren Board
  // ============================================================

  // --- device/.../system ---
  trackMqtt(deviceBase + "/system", function (msg) {
    dbg("RX/system", "RAW: " + msg.value);

    var obj = safeJson(msg.value);
    if (!obj) {
      return;
    }

    if (obj.auth) {
      if (obj.auth.device_mac !== undefined && obj.auth.device_mac !== null) {
        dev[vd][ctrlMac] = String(obj.auth.device_mac);
      }
      if (obj.auth.version !== undefined && obj.auth.version !== null) {
        dev[vd][ctrlFwVer] = String(obj.auth.version);
      }
      dbg(
        "RX/system",
        "auth: mac=" + dev[vd][ctrlMac] + " ver=" + dev[vd][ctrlFwVer],
      );
    }

    if (obj.device_subtype) {
      var ds = obj.device_subtype;
      if (ds.exchange_type !== undefined && ds.exchange_type !== null) {
        dev[vd][ctrlExchange] = String(ds.exchange_type);
      }
      if (ds.series !== undefined && ds.series !== null) {
        dev[vd][ctrlSeries] = String(ds.series);
      }
      if (ds.subtype !== undefined && ds.subtype !== null) {
        var sub = String(ds.subtype);
        if (ds.xtal_freq !== undefined && ds.xtal_freq !== null) {
          sub = sub + " (xtal:" + String(ds.xtal_freq) + ")";
        }
        dev[vd][ctrlSubtype] = sub;
      }
      dbg(
        "RX/system",
        "device_subtype: exchange=" +
          ds.exchange_type +
          " series=" +
          ds.series +
          " subtype=" +
          ds.subtype,
      );
    }

    if (obj.errors !== undefined && obj.errors.shutdown !== undefined) {
      var isShutdown = parseInt(obj.errors.shutdown, 10) === 1;
      dev[vd][ctrlErrShutdown] = isShutdown;
      setCtrlError(ctrlErrShutdown, isShutdown);
      if (isShutdown) {
        log.warning("[" + vd + "] ПЕРЕОХЛАЖДЕНИЕ! shutdown=1");
      }
    }

    setOnline();

    if (!_initialized) {
      _initialized = true;
      log.info(
        "[" +
          vd +
          "] первый пакет — FW=" +
          dev[vd][ctrlFwVer] +
          " MAC=" +
          dev[vd][ctrlMac] +
          " series=" +
          dev[vd][ctrlSeries],
      );
    }
  });

  // --- device/.../mode ---
  trackMqtt(deviceBase + "/mode", function (msg) {
    dbg("RX/mode", "RAW: " + msg.value);

    var obj = safeJson(msg.value);
    if (!obj) {
      return;
    }

    if (obj.capabilities !== undefined) {
      var cap = obj.capabilities;
      if (cap.speed !== undefined && cap.speed !== null) {
        dev[vd][ctrlSpeed] = parseInt(cap.speed, 10);
      }
      if (cap.gate !== undefined && cap.gate !== null) {
        var g = parseInt(cap.gate, 10);
        if (g >= 1 && g <= 4) {
          dev[vd][ctrlGate] = g;
        }
      }
      if (cap.on_off !== undefined && cap.on_off !== null) {
        dev[vd][ctrlState] = cap.on_off === "on";
      }
      if (cap.mode !== undefined && cap.mode !== null) {
        dev[vd][ctrlWorkmode] = String(cap.mode);
      }
      dbg(
        "RX/mode",
        "capabilities: mode=" +
          cap.mode +
          " on_off=" +
          cap.on_off +
          " speed=" +
          cap.speed +
          " gate=" +
          cap.gate,
      );
    }

    if (obj.settings !== undefined) {
      var s = obj.settings;
      dbg("RX/mode", "settings: " + JSON.stringify(s));

      // temperature_speed: [порог_темп, скорость]
      if (
        s.temperature_speed !== undefined &&
        Array.isArray(s.temperature_speed)
      ) {
        if (s.temperature_speed.length >= 1) {
          var thr = parseFloat(s.temperature_speed[0]);
          dev[vd][ctrlAutoTemp] = thr;
          // Синхронизируем writable контрол только если не менялся пользователем
          dev[vd][ctrlSmartTempThreshold] = thr;
        }
        if (s.temperature_speed.length >= 2) {
          dev[vd][ctrlAutoSpeed] = parseInt(s.temperature_speed[1], 10);
        }
      }

      if (s.emerg_shunt !== undefined && s.emerg_shunt !== null) {
        dev[vd][ctrlRelEmerg] = parseFloat(s.emerg_shunt);
        // Синхронизируем writable контрол
        dev[vd][ctrlEmergShunt] = parseFloat(s.emerg_shunt);
      }
      if (s.gate !== undefined && s.gate !== null) {
        dev[vd][ctrlRelGate] = parseInt(s.gate, 10);
        dev[vd][ctrlSmartGate] = parseInt(s.gate, 10);
      }
      if (s.smart_speed !== undefined && s.smart_speed !== null) {
        dev[vd][ctrlRelSmartSpd] = parseInt(s.smart_speed, 10);
        dev[vd][ctrlSmartSpeed] = parseInt(s.smart_speed, 10);
      }
    }

    setOnline();
  });

  // --- Легаси: температура ---
  trackMqtt(legacyBase + "/temp", function (msg) {
    var v = parseFloat(msg.value);
    if (!isNaN(v)) {
      dev[vd][ctrlTemp] = v;
    }
    setOnline();
    dbg("RX/temp", msg.value);
  });

  // --- Легаси: влажность ---
  trackMqtt(legacyBase + "/hud", function (msg) {
    var v = parseFloat(msg.value);
    if (!isNaN(v)) {
      dev[vd][ctrlHumidity] = v;
    }
    setOnline();
    dbg("RX/hud", msg.value);
  });

  // --- Легаси: state ---
  trackMqtt(legacyBase + "/state", function (msg) {
    dev[vd][ctrlState] = msg.value === "on";
    setOnline();
    dbg("RX/state", msg.value);
  });

  // --- Легаси: speed ---
  trackMqtt(legacyBase + "/speed", function (msg) {
    var v = parseInt(msg.value, 10);
    if (!isNaN(v) && v >= 0 && v <= 5) {
      dev[vd][ctrlSpeed] = v;
    }
    setOnline();
    dbg("RX/speed", msg.value);
  });

  // --- Легаси: gate ---
  trackMqtt(legacyBase + "/gate", function (msg) {
    var v = parseInt(msg.value, 10);
    if (!isNaN(v) && v >= 1 && v <= 4) {
      dev[vd][ctrlGate] = v;
    }
    setOnline();
    dbg("RX/gate", msg.value);
  });

  // --- Легаси: workmode ---
  trackMqtt(legacyBase + "/workmode", function (msg) {
    dev[vd][ctrlWorkmode] = String(msg.value);
    setOnline();
    dbg("RX/workmode", msg.value);
  });

  // --- Легаси: ответ на 0687 ---
  trackMqtt(legacyBase + "/system", function (msg) {
    setOnline();
    dbg("RX/legacy-system", msg.value);
  });

  // ============================================================
  // Polling / watchdog
  // ============================================================

  function pollDevice() {
    sendSystem({ type: "auth" });
    publish(legacyBase + "/system", "0687", 2, false);
    dbg("POLL", "heartbeat отправлен");
  }

  var _monitorReady = false;
  var _pollCount = 0;
  var _deepInterval = Math.max(
    1,
    Math.round(deep_poll_interval / polling_interval),
  );

  // Первый запрос сразу при старте
  pollDevice();
  setTimeout(deepPoll, 2000); // глубокий опрос через 2с после старта

  setInterval(function () {
    _pollCount++;
    pollDevice();

    // Глубокий опрос каждые deep_poll_interval секунд
    if (_pollCount % _deepInterval === 0) {
      deepPoll();
      log.info(
        "[" +
          vd +
          "] плановый глубокий опрос #" +
          Math.floor(_pollCount / _deepInterval),
      );
    }

    if (!_monitorReady) {
      _monitorReady = true;
      return;
    }

    var silenceMs = polling_interval * 2 * 1000;
    if (_lastAlive === 0 || Date.now() - _lastAlive > silenceMs) {
      setOffline();
    }
  }, polling_interval * 1000);

  log.info("[" + vd + "] инициализирован.");
  log.info("[" + vd + "]   JSON RX     : " + deviceBase + "/{system,mode}");
  log.info("[" + vd + "]   JSON TX     : " + serverBase + "/{system,mode}");
  log.info(
    "[" +
      vd +
      "]   Легаси      : " +
      legacyBase +
      "/{system,temp,hud,state,speed,gate,workmode}",
  );
  log.info("[" + vd + "]   Heartbeat   : каждые " + polling_interval + "с");
  log.info("[" + vd + "]   Глубокий опрос: каждые " + deep_poll_interval + "с");
  log.info("[" + vd + "]   ForceRefresh: кнопка в веб-интерфейсе");
  log.info(
    "[" +
      vd +
      "]   Debug       : включить '" +
      ctrlDebugLog +
      "' в веб-интерфейсе WB",
  );
}
