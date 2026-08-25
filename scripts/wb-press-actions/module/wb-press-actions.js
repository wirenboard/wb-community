// Module for assigning actions to press counters.

var incInterval = 75; //ms
var decInterval = 75; //ms

// Commands already registered by this module instance, keyed by
// actionType|btnControl|actionControl. The same command registered twice
// silently breaks it (two 'toggle' rules cancel each other out, inc/dec
// tickers run at double speed), so duplicates are rejected.
var registeredCommands = {};

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

// Press counters on WB devices are stored in the device itself and reset
// to 0 when it is power-cycled or reflashed. Such a change is not a button
// press: without this check every power blink on the bus triggers the action.
function isCounterReset(newValue) {
  return !newValue;
}

function normalizeInterval(value, fallback) {
  var ms = Number(value);
  if (!isFinite(ms) || ms <= 0) {
    log.error('wb-press-actions: invalid interval: {}', value);
    return fallback;
  }
  return ms;
}

function init(commands) {
  if (!Array.isArray(commands)) {
    log.error('wb-press-actions: init() expects an array of commands');
    return;
  }
  commands.forEach(function (item, i) {
    try {
      addAction(item, i);
    } catch (e) {
      log.error('wb-press-actions: command #{}: {}', i, e);
    }
  });
}

function addAction(item, index) {
  if (!item || !isNonEmptyString(item.btnControl) || !isNonEmptyString(item.actionControl)) {
    log.error('wb-press-actions: command #{}: btnControl and actionControl are required', index);
    return;
  }

  var actionType = item.actionType;
  if (actionType !== 'on' && actionType !== 'off' && actionType !== 'toggle' &&
      actionType !== 'inc' && actionType !== 'dec') {
    log.error('wb-press-actions: command #{}: unknown actionType: {}', index, actionType);
    return;
  }

  if ((actionType === 'inc' || actionType === 'dec') && !isNonEmptyString(item.stateControl)) {
    log.error('wb-press-actions: command #{}: stateControl is required for actionType "{}"', index, actionType);
    return;
  }

  var commandKey = '{}|{}|{}'.format(actionType, item.btnControl, item.actionControl);
  if (registeredCommands[commandKey]) {
    log.error('wb-press-actions: command #{}: duplicate command "{}" {} -> {}, skipping',
      index, actionType, item.btnControl, item.actionControl);
    return;
  }
  registeredCommands[commandKey] = true;

  switch (actionType) {
    case 'on':
      addActionOn(item.btnControl, item.actionControl);
      break;
    case 'off':
      addActionOff(item.btnControl, item.actionControl);
      break;
    case 'toggle':
      addActionToggle(item.btnControl, item.actionControl);
      break;
    case 'inc':
      addActionInc(item.btnControl, item.stateControl, item.actionControl, item.maxValue);
      break;
    case 'dec':
      addActionDec(item.btnControl, item.stateControl, item.actionControl, item.minValue);
      break;
  }
}

function addActionOn(btnControl, actionControl) {
  defineRule({
    whenChanged: btnControl,
    then: function (newValue) {
      if (isCounterReset(newValue)) return;
      dev[actionControl] = true;
    },
  });
}

function addActionOff(btnControl, actionControl) {
  defineRule({
    whenChanged: btnControl,
    then: function (newValue) {
      if (isCounterReset(newValue)) return;
      dev[actionControl] = false;
    },
  });
}

function addActionToggle(btnControl, actionControl) {
  defineRule({
    whenChanged: btnControl,
    then: function (newValue) {
      if (isCounterReset(newValue)) return;
      var current = dev[actionControl];
      if (current === null || current === undefined) {
        log.error('wb-press-actions: cannot toggle {}: its value is not available', actionControl);
        return;
      }
      dev[actionControl] = !current;
    },
  });
}

function addActionInc(btnControl, stateControl, actionControl, maxValue) {
  var timerName = '{}_{}_inc'.format(btnControl, actionControl);

  defineRule({
    whenChanged: btnControl,
    then: function (newValue) {
      if (isCounterReset(newValue)) return;
      startTicker(timerName, incInterval);
    },
  });

  initActionInc(timerName, stateControl, actionControl, maxValue);
}

function addActionDec(btnControl, stateControl, actionControl, minValue) {
  var timerName = '{}_{}_dec'.format(btnControl, actionControl);

  defineRule({
    whenChanged: btnControl,
    then: function (newValue) {
      if (isCounterReset(newValue)) return;
      startTicker(timerName, decInterval);
    },
  });

  initActionDec(timerName, stateControl, actionControl, minValue);
}

function initActionInc(timerName, stateControl, actionControl, maxValue) {
  if (maxValue == undefined) maxValue = 100;

  defineRule({
    when: function () {
      return timers[timerName].firing;
    },
    then: function () {
      var i = dev[actionControl];
      if (i === null || i === undefined) {
        log.error('wb-press-actions: cannot inc {}: its value is not available', actionControl);
        timers[timerName].stop();
        return;
      }
      var currentStateControlVal = dev[stateControl];
      if (currentStateControlVal === null || currentStateControlVal === undefined) {
        log.error('wb-press-actions: cannot inc {}: {} value is not available', actionControl, stateControl);
        timers[timerName].stop();
        return;
      }

      if (i < maxValue && currentStateControlVal) {
        dev[actionControl] = Math.min(i + 1, maxValue);
      } else {
        timers[timerName].stop();
      }
    },
  });
}

function initActionDec(timerName, stateControl, actionControl, minValue) {
  if (minValue == undefined) minValue = 0;

  defineRule({
    when: function () {
      return timers[timerName].firing;
    },
    then: function () {
      var i = dev[actionControl];
      if (i === null || i === undefined) {
        log.error('wb-press-actions: cannot dec {}: its value is not available', actionControl);
        timers[timerName].stop();
        return;
      }
      var currentStateControlVal = dev[stateControl];
      if (currentStateControlVal === null || currentStateControlVal === undefined) {
        log.error('wb-press-actions: cannot dec {}: {} value is not available', actionControl, stateControl);
        timers[timerName].stop();
        return;
      }

      if (i > minValue && currentStateControlVal) {
        dev[actionControl] = Math.max(i - 1, minValue);
      } else {
        timers[timerName].stop();
      }
    },
  });
}

exports.setIncInterval = function (value) {
  incInterval = normalizeInterval(value, incInterval);
};
exports.setDecInterval = function (value) {
  decInterval = normalizeInterval(value, decInterval);
};
exports.init = init;
