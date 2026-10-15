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

function toCounterValue(value) {
  var number = Number(value);
  return isFinite(number) ? number : null;
}

// Press counters live in the WB device, not in the controller. They reset to 0
// when the module is power-cycled or reflashed, and can come back with a lower
// non-zero value when the module is replaced or its firmware is rolled back.
// Neither is a button press, so an action may only run when the counter grew.
//
// Returns a guard closure for one command. The previous value is seeded at
// registration time, so the first real press after a rules engine restart is
// not swallowed. Every command gets its own closure on purpose: several
// commands may be bound to the same counter, and with shared state the first
// rule would consume the change and hide the press from the others.
function createPressGuard(btnControl) {
  var lastValue = toCounterValue(dev[btnControl]);

  return function (newValue) {
    var previous = lastValue;
    var current = toCounterValue(newValue);
    lastValue = current;

    if (current === null) return false;   // not a number - nothing to act on
    if (previous === null) return false;  // first value seen - nothing to compare with

    if (current < previous) {
      log('wb-press-actions: counter {} went back {} -> {}, not a press',
        btnControl, previous, current);
      return false;
    }

    return current > previous;
  };
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
  var isPress = createPressGuard(btnControl);

  defineRule({
    whenChanged: btnControl,
    then: function (newValue) {
      if (!isPress(newValue)) return;
      dev[actionControl] = true;
    },
  });
}

function addActionOff(btnControl, actionControl) {
  var isPress = createPressGuard(btnControl);

  defineRule({
    whenChanged: btnControl,
    then: function (newValue) {
      if (!isPress(newValue)) return;
      dev[actionControl] = false;
    },
  });
}

function addActionToggle(btnControl, actionControl) {
  var isPress = createPressGuard(btnControl);

  defineRule({
    whenChanged: btnControl,
    then: function (newValue) {
      if (!isPress(newValue)) return;
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

  var isPress = createPressGuard(btnControl);

  defineRule({
    whenChanged: btnControl,
    then: function (newValue) {
      if (!isPress(newValue)) return;
      startTicker(timerName, incInterval);
    },
  });

  initActionInc(timerName, stateControl, actionControl, maxValue);
}

function addActionDec(btnControl, stateControl, actionControl, minValue) {
  var timerName = '{}_{}_dec'.format(btnControl, actionControl);

  var isPress = createPressGuard(btnControl);

  defineRule({
    whenChanged: btnControl,
    then: function (newValue) {
      if (!isPress(newValue)) return;
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
