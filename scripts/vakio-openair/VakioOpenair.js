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
//            {"settings":{gate,smart_speed,emerg_shunt}}
//
// =============================================================
// УПРАВЛЕНИЕ РЕЖИМОМ
// =============================================================
// Поле "Workmode" — редактируемое текстовое поле.
// Пишите значение и нажимайте Enter:
//   manual     — ручной режим
//   super_auto — смарт-режим
// Значение отправляется напрямую на устройство как есть.
// При получении feedback с устройства поле обновляется автоматически.
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
// ОТЛАДОЧНЫЙ ЛОГ
// =============================================================
// Контрол "Debug_Log" (switch) — включить/выключить детальный лог
// без перезагрузки скрипта прямо из веб-интерфейса WB.
// Смотреть: journalctl -u wb-rules -f
// =============================================================

createVakioOpenAir({
  id: 1,
  topic: "VAKIO",
  endpoint: "openair",
  polling_interval: 10,
});

function createVakioOpenAir(params) {
  var id = params.id;
  var topic = params.topic;
  var endpoint = params.endpoint !== undefined ? params.endpoint : "openair";
  var polling_interval =
    params.polling_interval !== undefined ? params.polling_interval : 10;

  var vd = "Vakio_" + id + "_" + endpoint;

  // ============================================================
  // Имена контролов
  // ============================================================
  // Управление
  var ctrlState = "State";
  var ctrlWorkmode = "Workmode"; // text editable: manual | super_auto
  var ctrlSpeed = "Speed";
  var ctrlGate = "Gate";
  var ctrlClose = "CloseGate";

  // Статус
  var ctrlConnect = "Connect";
  var ctrlTemp = "Temperature";
  var ctrlHumidity = "Humidity";
  var ctrlErrShutdown = "Err_Shutdown";

  // Настройки смарт (управляемые)
  var ctrlSmartGate = "Smart_Gate";
  var ctrlSmartSpeed = "Smart_Speed";
  var ctrlEmergShunt = "Emerg_Shunt";
  var ctrlShutdownLimit = "Shutdown_Limit";

  // Авто-режим (readonly, из settings устройства)
  var ctrlAutoTemp = "Auto_Temp";
  var ctrlAutoSpeed = "Auto_Speed";

  // Информация об устройстве (readonly, из system)
  var ctrlFwVer = "FW_Version";
  var ctrlMac = "Device_MAC";
  var ctrlSeries = "HW_Series";
  var ctrlSubtype = "HW_Subtype";
  var ctrlExchange = "Exchange";

  // Relation из settings (readonly, из mode)
  var ctrlRelGate = "Rel_Gate";
  var ctrlRelSmartSpd = "Rel_SmartSpeed";
  var ctrlRelEmerg = "Rel_EmergShunt";

  // Отладка
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

  // ============================================================
  // Определение виртуального устройства
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
      // Редактируемое текстовое поле режима.
      // Допустимые значения: manual | super_auto
      // Обновляется автоматически из feedback устройства.
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

      // --- Настройки смарт-режима ---
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
      Emerg_Shunt: {
        title: "Смарт: температура откл. (°C)",
        type: "range",
        value: 10,
        min: -20,
        max: 25,
        order: 22,
      },
      Shutdown_Limit: {
        title: "Порог переохлаждения (°C)",
        type: "range",
        value: 0,
        min: -30,
        max: 10,
        order: 23,
      },

      // --- Авто-режим (readonly) ---
      Auto_Temp: {
        title: "Авто: порог темп. (°C)",
        type: "value",
        value: 0,
        readonly: true,
        order: 25,
      },
      Auto_Speed: {
        title: "Авто: скорость",
        type: "value",
        value: 0,
        readonly: true,
        order: 26,
      },

      // --- Информация об устройстве ---
      FW_Version: {
        title: "Прошивка",
        type: "text",
        value: "—",
        readonly: true,
        order: 30,
      },
      Device_MAC: {
        title: "MAC адрес",
        type: "text",
        value: "—",
        readonly: true,
        order: 31,
      },
      HW_Series: {
        title: "Серия железа",
        type: "text",
        value: "—",
        readonly: true,
        order: 32,
      },
      HW_Subtype: {
        title: "Подтип железа",
        type: "text",
        value: "—",
        readonly: true,
        order: 33,
      },
      Exchange: {
        title: "Протокол обмена",
        type: "text",
        value: "—",
        readonly: true,
        order: 34,
      },

      // --- Relation (readonly) ---
      Rel_Gate: {
        title: "Rel: заслонка авто",
        type: "value",
        value: 0,
        readonly: true,
        order: 40,
      },
      Rel_SmartSpeed: {
        title: "Rel: скорость смарт",
        type: "value",
        value: 0,
        readonly: true,
        order: 41,
      },
      Rel_EmergShunt: {
        title: "Rel: emerg_shunt",
        type: "value",
        value: 0,
        readonly: true,
        order: 42,
      },

      // --- Отладка ---
      Debug_Log: {
        title: "Детальный лог (Debug)",
        type: "switch",
        value: false,
        order: 50,
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

  // --- Режим: редактируемый текст, отправляем как есть ---
  // Пользователь вводит "manual" или "super_auto" и нажимает Enter.
  // Значение уходит напрямую в capabilities.mode без какой-либо обработки.
  trackMqtt(
    "/devices/" + vd + "/controls/" + ctrlWorkmode + "/on",
    function (msg) {
      var mode = String(msg.value).trim();
      log.info("[" + vd + "] режим → " + mode);
      sendCapabilities({ mode: mode });
    },
  );

  // --- Скорость с интерлоком ---
  // Speed = 0 → стоп → заслонка в 2
  // Speed > 0 → заслонка в 4 → скорость + вкл
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
  // Стоп вентилятора → переход заслонки
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

  // --- Настройки смарт-режима ---
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
      dbg(
        "RX/system",
        "auth: mac=" + obj.auth.device_mac + " ver=" + obj.auth.version,
      );
      if (obj.auth.device_mac !== undefined && obj.auth.device_mac !== null) {
        dev[vd][ctrlMac] = String(obj.auth.device_mac);
      }
      if (obj.auth.version !== undefined && obj.auth.version !== null) {
        dev[vd][ctrlFwVer] = String(obj.auth.version);
      }
    } else {
      dbg("RX/system", "нет поля auth");
    }

    if (obj.device_subtype) {
      var ds = obj.device_subtype;
      dbg(
        "RX/system",
        "device_subtype: exchange=" +
          ds.exchange_type +
          " series=" +
          ds.series +
          " subtype=" +
          ds.subtype +
          " xtal=" +
          ds.xtal_freq,
      );
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
    } else {
      dbg("RX/system", "нет поля device_subtype");
    }

    if (obj.errors !== undefined) {
      dbg("RX/system", "errors: " + JSON.stringify(obj.errors));
      if (obj.errors.shutdown !== undefined) {
        var isShutdown = parseInt(obj.errors.shutdown, 10) === 1;
        dev[vd][ctrlErrShutdown] = isShutdown;
        setCtrlError(ctrlErrShutdown, isShutdown);
        if (isShutdown) {
          log.warning("[" + vd + "] ПЕРЕОХЛАЖДЕНИЕ! shutdown=1");
        }
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
        // Обновляем текстовое поле режима из feedback устройства
        dev[vd][ctrlWorkmode] = String(cap.mode);
      }
    } else {
      dbg("RX/mode", "нет поля capabilities");
    }

    if (obj.settings !== undefined) {
      var s = obj.settings;
      dbg("RX/mode", "settings: " + JSON.stringify(s));

      if (
        s.temperature_speed !== undefined &&
        Array.isArray(s.temperature_speed)
      ) {
        if (s.temperature_speed.length >= 1) {
          dev[vd][ctrlAutoTemp] = parseFloat(s.temperature_speed[0]);
        }
        if (s.temperature_speed.length >= 2) {
          dev[vd][ctrlAutoSpeed] = parseInt(s.temperature_speed[1], 10);
        }
      }
      if (s.emerg_shunt !== undefined && s.emerg_shunt !== null) {
        dev[vd][ctrlRelEmerg] = parseFloat(s.emerg_shunt);
      }
      if (s.gate !== undefined && s.gate !== null) {
        dev[vd][ctrlRelGate] = parseInt(s.gate, 10);
      }
      if (s.smart_speed !== undefined && s.smart_speed !== null) {
        dev[vd][ctrlRelSmartSpd] = parseInt(s.smart_speed, 10);
      }
    } else {
      dbg("RX/mode", "нет поля settings");
    }

    setOnline();
  });

  // --- Легаси: температура ---
  trackMqtt(legacyBase + "/temp", function (msg) {
    dbg("RX/temp", "RAW: " + msg.value);
    var v = parseFloat(msg.value);
    if (!isNaN(v)) {
      dev[vd][ctrlTemp] = v;
    }
    setOnline();
  });

  // --- Легаси: влажность ---
  trackMqtt(legacyBase + "/hud", function (msg) {
    dbg("RX/hud", "RAW: " + msg.value);
    var v = parseFloat(msg.value);
    if (!isNaN(v)) {
      dev[vd][ctrlHumidity] = v;
    }
    setOnline();
  });

  // --- Легаси: state ---
  trackMqtt(legacyBase + "/state", function (msg) {
    dbg("RX/state", "RAW: " + msg.value);
    dev[vd][ctrlState] = msg.value === "on";
    setOnline();
  });

  // --- Легаси: speed ---
  trackMqtt(legacyBase + "/speed", function (msg) {
    dbg("RX/speed", "RAW: " + msg.value);
    var v = parseInt(msg.value, 10);
    if (!isNaN(v) && v >= 0 && v <= 5) {
      dev[vd][ctrlSpeed] = v;
    }
    setOnline();
  });

  // --- Легаси: gate ---
  trackMqtt(legacyBase + "/gate", function (msg) {
    dbg("RX/gate", "RAW: " + msg.value);
    var v = parseInt(msg.value, 10);
    if (!isNaN(v) && v >= 1 && v <= 4) {
      dev[vd][ctrlGate] = v;
    }
    setOnline();
  });

  // --- Легаси: workmode ---
  trackMqtt(legacyBase + "/workmode", function (msg) {
    dbg("RX/workmode", "RAW: " + msg.value);
    dev[vd][ctrlWorkmode] = String(msg.value);
    setOnline();
  });

  // ============================================================
  // Polling / watchdog
  // ============================================================
  // Двойной опрос при каждом тике:
  // 1. {"type":"auth"} → server/.../system  (JSON-протокол)
  // 2. "0687" → legacyBase/system           (легаси "повтор регистрации")

  function pollDevice() {
    sendSystem({ type: "auth" });
    publish(legacyBase + "/system", "0687", 2, false);
    dbg("POLL", "auth + 0687 отправлены");
  }

  // Ловим ответ на 0687 (legacy heartbeat)
  trackMqtt(legacyBase + "/system", function (msg) {
    dbg("RX/legacy-system", "RAW: " + msg.value);
    setOnline();
  });

  var _monitorReady = false;
  pollDevice();

  setInterval(function () {
    pollDevice();

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
  log.info("[" + vd + "]   JSON RX : " + deviceBase + "/{system,mode}");
  log.info("[" + vd + "]   JSON TX : " + serverBase + "/{system,mode}");
  log.info(
    "[" +
      vd +
      "]   Легаси  : " +
      legacyBase +
      "/{system,temp,hud,state,speed,gate,workmode}",
  );
  log.info(
    "[" + vd + "]   Polling : каждые " + polling_interval + "с (auth + 0687)",
  );
  log.info(
    "[" +
      vd +
      "]   Debug   : включить '" +
      ctrlDebugLog +
      "' в веб-интерфейсе WB",
  );
}
