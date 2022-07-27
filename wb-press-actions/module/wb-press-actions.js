// Module for assigning actions to press counters.

var incInterval = 75; //ms
var decInterval = 75; //ms

function init(commands) {
  commands.forEach(function (item, i, arr) {
    addAction(item.btnControl, item.stateControl, item.actionControl, item.actionType)
  });
}

function addAction(btnControl, stateControl, actionControl, actionType) {
  switch (actionType) {
    case "on":
      addActionOn(btnControl, actionControl)
      break
    case "off":
      addActionOff(btnControl, actionControl)
      break
    case "toggle":
      addActionToggle(btnControl, actionControl)
      break
    case "inc":
      addActionInc(btnControl, stateControl, actionControl)
      break
    case "dec":
      addActionDec(btnControl, stateControl, actionControl)
      break
    default:
      log("Unknown actionType: {}", actionType)
      break
  }
}

function addActionOn(btnControl, actionControl) {
  defineRule({
    whenChanged: btnControl,
    then: function (newValue, devName, cellName) {
      dev[actionControl] = true;
    }
  });
}

function addActionOff(btnControl, actionControl) {
  defineRule({
    whenChanged: btnControl,
    then: function (newValue, devName, cellName) {
      dev[actionControl] = false;
    }
  });
}

function addActionToggle(btnControl, actionControl) {
  defineRule({
    whenChanged: btnControl,
    then: function (newValue, devName, cellName) {
      dev[actionControl] = !dev[actionControl]
    }
  });
}

function addActionInc(btnControl, stateControl, actionControl) {
  defineRule({
    whenChanged: btnControl,
    then: function (newValue, devName, cellName) {
      startTicker("{}_{}_inc".format(btnControl, actionControl), incInterval)
    }
  });

  initActionInc(btnControl, stateControl, actionControl)
}

function addActionDec(btnControl, stateControl, actionControl) {
  defineRule({
    whenChanged: btnControl,
    then: function (newValue, devName, cellName) {
      startTicker("{}_{}_dec".format(btnControl, actionControl), decInterval)
    }
  });

  initActionDec(btnControl, stateControl, actionControl)
}

function initActionInc(btnControl, stateControl, actionControl) {
  var timerName = "{}_{}_inc".format(btnControl, actionControl);

  defineRule({
    when: function () { return timers[timerName].firing; },
    then: function () {
      var i = dev[actionControl]

      if (i < 100 && dev[stateControl]) {
        i++
        dev[actionControl] = i
      } else {
        timers[timerName].stop()
      }
    }
  });
}

function initActionDec(btnControl, stateControl, actionControl) {
  var timerName = "{}_{}_dec".format(btnControl, actionControl);

  defineRule({
    when: function () { return timers[timerName].firing; },
    then: function () {
      var i = dev[actionControl]

      if (i > 0 && dev[stateControl]) {
        i--
        dev[actionControl] = i
      } else {
        timers[timerName].stop()
      }
    }
  });
}

exports.incInterval = incInterval;
exports.decInterval = decInterval;
exports.init = function (commands) {
  init(commands);
};