function init(topics) {
  //-------------------------------------------------------------------------------------------------------------------------
  //sensorController
  function makeSensorController(title, name, target, minSensorValue, maxSensorValue) {
    defineVirtualDevice(name, {
      title: 'Sensor Controller ' + title,
      cells: {
        value: {
          title: 'Temperature',
          type: 'value',
          units: 'deg C',
          value: null,
          readonly: true,
        },
        valid: {
          title: 'Valid Value',
          type: 'switch',
          value: false,
          readonly: true,
        },
      },
    });

    defineRule({
      whenChanged: [target, target + '#error'],
      then: function (newValue, devName, cellName) {
        var valid = true;
        if (typeof dev[target + '#error'] !== 'undefined') {
          valid = false;
        }
        if (dev[target] == undefined || dev[target] == null) {
          valid = false;
        }
        if (dev[target] > maxSensorValue) {
          valid = false;
        }
        if (dev[target] < minSensorValue) {
          valid = false;
        }
        dev[name]['valid'] = valid;
        if (valid) {
          dev[name]['value'] = Number(dev[target].toFixed(1));
        }
      },
    });
  }

  makeSensorController('Air', 'ai_t_air', topics.AI_T_AIR, 0, 50);
  makeSensorController('Water', 'ai_t_water', topics.AI_T_WATER, 0, 100);

  //-------------------------------------------------------------------------------------------------------------------------
  //safetyController
  var T_AIR_MIN = 10; //минимально допустимая температура воздуха на выходе вентустановки
  var T_WATER_MIN = 20; //минимально допустимая температура воды в "обратке"

  defineVirtualDevice('safetyController', {
    title: 'Safety Controller',
    cells: {
      safe: {
        title: 'Safe Mode',
        type: 'switch',
        value: false,
        readonly: true,
      },
    },
  });

  function setSafetyControllerState() {
    if (!dev['ai_t_air/valid']) {
      return false;
    }
    if (!dev['ai_t_water/valid']) {
      return false;
    }
    if (dev['ai_t_air/value'] < T_AIR_MIN) {
      return false;
    }
    if (dev['ai_t_water/value'] < T_WATER_MIN) {
      return false;
    }
    if (dev['flapController/state'] == 'fault') {
      return false;
    }
    if (dev['fanController/state'] == 'fault') {
      return false;
    }
    if (!dev[topics.DI_NOT_FIRE]) {
      return false;
    }
    return true;
  }

  defineRule('safetyControllerTriggers', {
    whenChanged: [
      'ai_t_air/valid',
      'ai_t_water/valid',
      'ai_t_air/value',
      'ai_t_water/value',
      'flapController/state',
      'fanController/state',
      topics.DI_NOT_FIRE,
    ],
    then: function (newValue, devName, cellName) {
      dev['safetyController/safe'] = setSafetyControllerState();
    },
  });

  //-------------------------------------------------------------------------------------------------------------------------
  //flapController
  var idFlapTimer = null;
  var FLAP_TIMEOUT_S = 30; //допустимое время открытия заслонки, с

  defineVirtualDevice('flapController', {
    title: 'Flap Controller',
    cells: {
      enable: {
        title: 'Enable',
        type: 'switch',
        value: false,
        readonly: true,
      },
      state: {
        title: 'State',
        type: 'text', //open, close, moving, fault
        value: 'close',
        readonly: true,
      },
    },
  });

  function startFlapTimer() {
    return setTimeout(function () {
      dev[topics.DO_OPEN] = false;
      dev['flapController/state'] = 'fault';
    }, FLAP_TIMEOUT_S * 1000);
  }

  defineRule('flapControllerEnableTrigger', {
    whenChanged: 'flapController/enable',
    then: function (newValue, devName, cellName) {
      switch (dev['flapController/state']) {
        case 'close':
          if (newValue) {
            dev[topics.DO_OPEN] = true;
            idFlapTimer = startFlapTimer();
            dev['flapController/state'] = 'moving';
          }
          break;
        case 'open':
          if (!newValue) {
            dev[topics.DO_OPEN] = false;
            idFlapTimer = startFlapTimer();
            dev['flapController/state'] = 'moving';
          }
          break;
      }
    },
  });

  defineRule('flapControllerSwClosedTrigger', {
    whenChanged: topics.DI_CLOSED,
    then: function (newValue, devName, cellName) {
      switch (dev['flapController/state']) {
        case 'close':
          if (!newValue) {
            dev['flapController/state'] = 'fault';
          }
          break;
        case 'moving':
          if (newValue) {
            clearTimeout(idFlapTimer);
            dev['flapController/state'] = 'close';
          }
          break;
        case 'fault':
          if (!dev[topics.DI_HS] && newValue) {
            dev['flapController/state'] = 'close';
          }
          break;
      }
    },
  });

  defineRule('flapControllerSwOpenTrigger', {
    whenChanged: topics.DI_OPEN,
    then: function (newValue, devName, cellName) {
      switch (dev['flapController/state']) {
        case 'open':
          if (!newValue) {
            dev[topics.DO_OPEN] = false;
            dev['flapController/state'] = 'fault';
          }
          break;
        case 'moving':
          if (newValue) {
            clearTimeout(idFlapTimer);
            dev['flapController/state'] = 'open';
          }
          break;
      }
    },
  });

  defineRule('flapControllerHsTrigger', {
    whenChanged: topics.DI_HS,
    then: function (newValue, devName, cellName) {
      switch (dev['flapController/state']) {
        case 'fault':
          if (!newValue && dev[topics.DI_CLOSED]) {
            dev['flapController/state'] = 'close';
          }
          break;
      }
    },
  });

  //-------------------------------------------------------------------------------------------------------------------------
  //fanController
  var idFanTimer = null;
  var FAN_TIMEOUT_S = 10; //допустимое время нахождения в режиме run, с

  function startFanTimer() {
    return setTimeout(function () {
      dev[topics.DO_FAN] = false;
      dev['fanController/state'] = 'fault';
    }, FAN_TIMEOUT_S * 1000);
  }

  defineVirtualDevice('fanController', {
    title: 'Fan Controller',
    cells: {
      enable: {
        title: 'Enable',
        type: 'switch',
        value: false,
        readonly: true,
      },
      state: {
        //stop, run, work, fault
        title: 'State',
        type: 'text',
        value: 'stop',
        readonly: true,
      },
    },
  });

  defineRule('fanControllerEnableTrigger', {
    whenChanged: 'fanController/enable',
    then: function (newValue, devName, cellName) {
      switch (dev['fanController/state']) {
        case 'stop':
          if (newValue) {
            dev[topics.DO_FAN] = true;
            idFanTimer = startFanTimer();
            dev['fanController/state'] = 'run';
          }
          break;
        case 'run':
          if (!newValue) {
            dev[topics.DO_FAN] = false;
            dev['fanController/state'] = 'stop';
          }
          break;
        case 'work':
          if (!newValue) {
            dev[topics.DO_FAN] = false;
            dev['fanController/state'] = 'stop';
          }
          break;
      }
    },
  });

  defineRule('fanControllerTsTrigger', {
    whenChanged: topics.DI_TS_FAN,
    then: function (newValue, devName, cellName) {
      switch (dev['fanController/state']) {
        case 'stop':
          if (!newValue) {
            dev['fanController/state'] = 'fault';
          }
          break;
        case 'run':
          if (!newValue) {
            dev[topics.DO_FAN] = false;
            dev['fanController/state'] = 'fault';
          }
          break;
        case 'work':
          if (!newValue) {
            dev[topics.DO_FAN] = false;
            dev['fanController/state'] = 'fault';
          }
          break;
        case 'fault':
          if (!dev[topics.DI_HS] && newValue && !dev[topics.DI_PS_FAN]) {
            dev['fanController/state'] = 'stop';
          }
          break;
      }
    },
  });

  defineRule('fanControllerPsTrigger', {
    whenChanged: topics.DI_PS_FAN,
    then: function (newValue, devName, cellName) {
      switch (dev['fanController/state']) {
        case 'stop':
          if (newValue) {
            dev['fanController/state'] = 'fault';
          }
          break;
        case 'run':
          if (newValue) {
            clearTimeout(idFanTimer);
            dev['fanController/state'] = 'work';
          }
          break;
        case 'work':
          if (!newValue) {
            dev[topics.DO_FAN] = false;
            dev['fanController/state'] = 'fault';
          }
          break;
        case 'fault':
          if (!dev[topics.DI_HS] && dev[topics.DI_TS_FAN] && !newValue) {
            dev['fanController/state'] = 'stop';
          }
          break;
      }
    },
  });

  defineRule('fanControllerHsTrigger', {
    whenChanged: topics.DI_HS,
    then: function (newValue, devName, cellName) {
      switch (dev['fanController/state']) {
        case 'fault':
          if (!newValue && dev[topics.DI_TS_FAN] && !dev[topics.DI_PS_FAN]) {
            dev['fanController/state'] = 'stop';
          }
          break;
      }
    },
  });

  //-------------------------------------------------------------------------------------------------------------------------
  //heaterController
  var error = 0.5; //допустимое отклонение температуры воздуха
  var idMoreTimer = null; //идентификатор таймера для импульса "больше"
  var idLessTimer = null; //идентификатор таймера для импульса "меньше"
  var idPidTimer = null; //идентификатор таймера ПИД регулятора
  var SETPOINT_T_AIR = 22; //уставка температуры воздуха
  var pid = {
    //коэффициенты для ПИД регулятора
    K: 50, //общий коэффициент усиления
    TAU: 5, //коэффициент при дифференциальной составляющей, определяет чувствительность к резким изменениям температур
    BORDER_MS: 300, //минимальная длительность импульса управления, мс
    PERIOD_S: 10, //период регулирования, с
  };
  var prevDiff = null; //предыдущее рассогласование
  var leftover = null; //если при вычислениях длина импульса меньше минимальной - пишем сюда

  function generateMoreImpulse(pulseTime_s) {
    if (idMoreTimer) {
      clearTimeout(idMoreTimer);
      idMoreTimer = null;
    } else {
      dev[topics.DO_MORE] = true;
    }
    idMoreTimer = setTimeout(function () {
      dev[topics.DO_MORE] = false;
      idMoreTimer = null;
    }, pulseTime_s * 1000);
  }

  function generateLessImpulse(pulseTime_s) {
    if (idLessTimer) {
      clearTimeout(idLessTimer);
      idLessTimer = null;
    } else {
      dev[topics.DO_LESS] = true;
    }
    idLessTimer = setTimeout(function () {
      dev[topics.DO_LESS] = false;
      idLessTimer = null;
    }, pulseTime_s * 1000);
  }

  function calculatePulseTime() {
    var diff = SETPOINT_T_AIR - dev[topics.AI_T_AIR]; //текущее рассогласование
    var delta = diff - prevDiff; //изменение рассогласования между соседними измерениями
    var result = Math.round(2.5 * pid.K * (diff + pid.TAU * delta));
    if ((result > 0 && leftover < 0) || (result < 0 && leftover > 0)) {
      leftover = 0;
    }
    result = result + leftover;
    // Записываем новую разницу
    prevDiff = diff;
    leftover = 0;
    // При длине импульса меньше минимальной - запоминаем, но не выдаем
    if (Math.abs(result) < pid.BORDER_MS) {
      leftover = result;
      result = 0;
    }
    return result;
  }

  function run() {
    //если текущая T в пределах уставки +/- погрешность - ничего не делаем
    if (Math.abs(dev[topics.AI_T_AIR] - SETPOINT_T_AIR) < error) {
      return;
    }
    var out = calculatePulseTime();
    dev[topics.DO_MORE] = false;
    dev[topics.DO_LESS] = false;
    if (out < 0) {
      generateLessImpulse(Math.abs(out) / 1000);
    }
    if (out > 0) {
      generateMoreImpulse(out / 1000);
    }
  }

  function enablePid() {
    if (idPidTimer == null) {
      idPidTimer = setInterval(function () {
        run();
      }, pid.PERIOD_S * 1000);
    }
  }

  function disablePid() {
    if (idPidTimer != null) {
      clearInterval(idPidTimer);
      idPidTimer = null;
    }
  }

  defineVirtualDevice('heaterController', {
    title: 'Heater Controller',
    cells: {
      enable: {
        title: 'Enable',
        type: 'switch',
        value: false,
      },
      state: {
        //work, safe
        title: 'State',
        type: 'text',
        value: 'safe',
        readonly: true,
      },
    },
  });

  defineRule('heaterControllerEnableTrigger', {
    whenChanged: 'heaterController/enable',
    then: function (newValue, devName, cellName) {
      switch (dev['heaterController/state']) {
        case 'safe':
          if (newValue) {
            dev['heaterController/state'] = 'work';
            enablePid();
          }
          break;
        case 'work':
          if (!newValue) {
            dev[topics.DO_LESS] = false;
            dev[topics.DO_MORE] = true;
            dev[topics.DO_PUMP] = true;
            dev['heaterController/state'] = 'safe';
            disablePid();
          }
          break;
      }
    },
  });

  //-------------------------------------------------------------------------------------------------------------------------
  //mainController
  var T_WATER_START = 30; //минимальная температура воды в "обратке", при которой возможен старт вентустановки

  defineVirtualDevice('mainController', {
    title: 'Main Controller',
    cells: {
      state: {
        //safe, warming, opening, running, work
        title: 'State',
        type: 'text',
        value: 'safe',
        readonly: true,
      },
    },
  });

  defineRule('mainControllerHsTrigger', {
    whenChanged: topics.DI_HS,
    then: function (newValue, devName, cellName) {
      switch (dev['mainController/state']) {
        case 'safe':
          if (newValue && dev['safetyController/safe']) {
            dev['mainController/state'] = 'warming';
          }
          break;
        case 'warming':
          if (!newValue) {
            dev['mainController/state'] = 'safe';
            break;
          }
        case 'opening':
          if (!newValue) {
            dev['flapController/enable'] = false;
            dev['mainController/state'] = 'safe';
          }
          break;
        case 'running':
          if (!newValue) {
            dev['flapController/enable'] = false;
            dev['fanController/enable'] = false;
            dev['mainController/state'] = 'safe';
          }
          break;
        case 'work':
          if (!newValue) {
            dev['heaterController/enable'] = false;
            dev['flapController/enable'] = false;
            dev['fanController/enable'] = false;
            dev['mainController/state'] = 'safe';
          }
          break;
      }
    },
  });

  defineRule('mainControllerAiTrigger', {
    whenChanged: 'ai_t_water/value',
    then: function (newValue, devName, cellName) {
      if (newValue < T_WATER_START) return;
      switch (dev['mainController/state']) {
        case 'warming':
          dev['flapController/enable'] = true;
          dev['mainController/state'] = 'opening';
          break;
      }
    },
  });

  defineRule('mainControllerFlapTrigger', {
    whenChanged: 'flapController/state',
    then: function (newValue, devName, cellName) {
      if (newValue != 'open') return;
      switch (dev['mainController/state']) {
        case 'opening':
          dev['fanController/enable'] = true;
          dev['mainController/state'] = 'running';
          break;
      }
    },
  });

  defineRule('mainControllerSafeTrigger', {
    whenChanged: 'safetyController/safe',
    then: function (newValue, devName, cellName) {
      if (newValue) return;
      switch (dev['mainController/state']) {
        case 'safe':
          if (dev[topics.DI_HS] && newValue) {
            dev['mainController/state'] = 'warming';
          }
          dev['mainController/state'] = 'safe';
          break;
        case 'warming':
          dev['mainController/state'] = 'safe';
          break;
        case 'opening':
          dev['flapController/enable'] = false;
          dev['mainController/state'] = 'safe';
          break;
        case 'running':
          dev['flapController/enable'] = false;
          dev['fanController/enable'] = false;
          dev['mainController/state'] = 'safe';
          break;
        case 'work':
          dev['heaterController/enable'] = false;
          dev['flapController/enable'] = false;
          dev['fanController/enable'] = false;
          dev['mainController/state'] = 'safe';
          break;
      }
    },
  });

  defineRule('mainControllerFanTrigger', {
    whenChanged: 'fanController/state',
    then: function (newValue, devName, cellName) {
      if (newValue != 'work') return;
      switch (dev['mainController/state']) {
        case 'running':
          dev['heaterController/enable'] = true;
          dev['mainController/state'] = 'work';
          break;
      }
    },
  });

  //-------------------------------------------------------------------------------------------------------------------------
  //logger
  defineVirtualDevice('logger', {
    title: 'Logger',
    cells: {
      enable: {
        type: 'switch',
        value: false,
      },
    },
  });

  defineRule('changeControllersState', {
    whenChanged: [
      'safetyController/state',
      'flapController/state',
      'fanController/state',
      'heaterController/state',
      'mainController/state',
    ],
    then: function (newValue, devName, cellName) {
      if (dev['logger/enable']) {
        log.info('[' + devName + '] state:' + newValue);
      }
    },
  });
}

exports.init = function (topics) {
  init(topics);
};
