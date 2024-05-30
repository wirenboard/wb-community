// Module for assigning actions to press counters.

var incInterval = 75; //ms
var decInterval = 75; //ms

function init(commands) {
  commands.forEach(function (item, i, arr) {
    addAction(item);
  });
}

function addAction(item) {
  switch (item.actionType) {
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
    default:
      log('Unknown actionType: {}', item.actionType);
      break;
  }
}

function addActionOn(btnControl, actionControl) {
  defineRule({
    whenChanged: btnControl,
    then: function (newValue, devName, cellName) {
      dev[actionControl] = true;
    },
  });
}

function addActionOff(btnControl, actionControl) {
  defineRule({
    whenChanged: btnControl,
    then: function (newValue, devName, cellName) {
      dev[actionControl] = false;
    },
  });
}

function addActionToggle(btnControl, actionControl) {
  defineRule({
    whenChanged: btnControl,
    then: function (newValue, devName, cellName) {
      dev[actionControl] = !dev[actionControl];
    },
  });
}

function addActionInc(btnControl, stateControl, actionControl, maxValue) {
  defineRule({
    whenChanged: btnControl,
    then: function (newValue, devName, cellName) {
      startTicker('{}_{}_inc'.format(btnControl, actionControl), incInterval);
    },
  });

  initActionInc(btnControl, stateControl, actionControl, maxValue);
}

function addActionDec(btnControl, stateControl, actionControl, minValue) {
  defineRule({
    whenChanged: btnControl,
    then: function (newValue, devName, cellName) {
      startTicker('{}_{}_dec'.format(btnControl, actionControl), decInterval);
    },
  });

  initActionDec(btnControl, stateControl, actionControl, minValue);
}

function initActionInc(btnControl, stateControl, actionControl, maxValue) {
  var timerName = '{}_{}_inc'.format(btnControl, actionControl);

  defineRule({
    when: function () {
      return timers[timerName].firing;
    },
    then: function () {
      var i = dev[actionControl];
      if(i === null || i === undefined) {
          log.error("Cannot make initActionInc: actionControl ({}) of btnControl ({}) is empty".format(actionControl, btnControl))
          timers[timerName].stop()
          return
      }
      if(stateControl === null || stateControl === undefined) {
          log.error("Cannot make initActionInc: stateControl ({}) of btnControl {} is empty".format(stateControl, btnControl))
          timers[timerName].stop()
          return
      }
      if (maxValue == undefined) maxValue = 100;

      if (i < maxValue && dev[stateControl]) {
        i++;
        dev[actionControl] = i;
      } else {
        timers[timerName].stop();
      }
    },
  });
}

function initActionDec(btnControl, stateControl, actionControl, minValue) {
  var timerName = '{}_{}_dec'.format(btnControl, actionControl);

  defineRule({
    when: function () {
      return timers[timerName].firing;
    },
    then: function () {
      var i = dev[actionControl];
      if(i === null || i === undefined) {
          log.error("Cannot make initActionDec: actionControl ({}) of btnControl ({}) is empty".format(actionControl, btnControl))
          timers[timerName].stop()
          return
      }
      if(stateControl === null || stateControl === undefined) {
          log.error("Cannot make initActionDec: stateControl ({}) of btnControl {} is empty".format(stateControl, btnControl))
          timers[timerName].stop()
          return
      }
      if (minValue == undefined) minValue = 0;

      if (i > minValue && dev[stateControl]) {
        i--;
        dev[actionControl] = i;
      } else {
        timers[timerName].stop();
      }
    },
  });
}

exports.setIncInterval = function (value) {
  incInterval = value;
};
exports.setDecInterval = function (value) {
  decInterval = value;
};
exports.init = function (commands) {
  init(commands);
};
