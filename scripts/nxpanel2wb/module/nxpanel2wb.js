var panelIsInitialized = false;
var lastSeen = 0;
var idVirtDev = '';
var idTasmota = '';

var p = {
  Main: 10,
  Dimmer: 11,
  Led: 12,
  Therm: 13,
};

var b = {
  Bulb: 1,
  Dimmer: 2,
  Led: 3,
  Therm: 4,
  Scene1: 5,
  Scene2: 6,
};

function init(deviceName, tasmotaName) {
  idVirtDev = deviceName; //"ns-panel"
  idTasmota = tasmotaName; //"tasmota_C846D4"

  initConst();
  initVirtualDevice();
  initTracking();
  initPanel();
}

function initPanel() {
  sendCommand({ start: { pid: p.Main, format: pf.buttons6 } });
  sendCommand({ favorite: { pid: p.Led, format: pf.dimmer_color } });
  sendCommand({ dim: { low: 5, normal: 100 } });
  sendCommand({ notifications: { reset: 1 } });
  sendCommand({ notifications: { text: 'Wiren Board' } });

  setBuzzer(3, 1, 2);

  setIsInitialized(true);
}

function initVirtualDevice() {
  var device = defineVirtualDevice(idVirtDev, {
    title: 'NS Panel ({})'.format(idVirtDev),
    cells: {},
  });

  device.addControl('Relay 1', { type: 'switch', value: false, order: 1 });
  device.addControl('Relay 2', { type: 'switch', value: false, order: 2 });
  device.addControl('Bulb', { type: 'switch', value: false, order: 3 });
  device.addControl('Dimmer State', { type: 'switch', value: false, order: 4 });
  device.addControl('Dimmer Range', {
    type: 'range',
    value: 0,
    order: 5,
    max: 100,
  });
  device.addControl('Led State', { type: 'switch', value: false, order: 6 });
  device.addControl('Led Hue', { type: 'range', value: 0, order: 7, max: 360 });
  device.addControl('Led Saturation', {
    type: 'range',
    value: 0,
    order: 8,
    max: 100,
  });
  device.addControl('Led Brightness', {
    type: 'range',
    value: 0,
    order: 9,
    max: 100,
  });
  device.addControl('Scene1', { type: 'switch', value: false, order: 10 });
  device.addControl('Scene2', { type: 'switch', value: false, order: 11 });
  device.addControl('Heat Icon', {
    type: 'range',
    value: 0,
    order: 12,
    max: 3,
  });
  device.addControl('House Icon', {
    type: 'range',
    value: 0,
    order: 13,
    max: 3,
  });
  device.addControl('Motion Icon', {
    type: 'range',
    value: 0,
    order: 14,
    max: 3,
  });
  device.addControl('Zap Icon', { type: 'range', value: 0, order: 15, max: 3 });
  device.addControl('Therm State', { type: 'switch', value: false, order: 16 });
  device.addControl('Therm Heat', { type: 'switch', value: false, order: 17 });
  device.addControl('Therm Room Temp', {
    type: 'temperature',
    value: 0,
    order: 18,
  });
  device.addControl('Therm Set Temp', {
    type: 'value',
    value: 0,
    order: 19,
    readonly: false,
  });
  device.addControl('Room Temp', { type: 'temperature', value: 0, order: 20 });
  device.addControl('ESP32 Temp', { type: 'temperature', value: 0, order: 21 });
  device.addControl('Panel Time', { type: 'text', value: null, order: 22 });
  device.addControl('Status', { type: 'text', value: null, order: 23 });
  device.addControl('Initialized', {
    type: 'switch',
    value: false,
    order: 24,
    readonly: true,
  });
  device.addControl('Status', {
    type: 'text',
    value: null,
    order: 25,
    readonly: false,
  });
  device.addControl('Send Raw', {
    type: 'text',
    value: null,
    order: 26,
    readonly: false,
  });

  // What to do with the panel when changing values in the virtual device.
  defineRule({
    whenChanged: [
      idVirtDev + '/Relay 1',
      idVirtDev + '/Relay 2',
      idVirtDev + '/Send Raw',
      idVirtDev + '/Motion Icon',
      idVirtDev + '/House Icon',
      idVirtDev + '/Zap Icon',
      idVirtDev + '/Heat Icon',
      idVirtDev + '/Therm State',
      idVirtDev + '/Therm Heat',
      idVirtDev + '/Heat Icon',
      idVirtDev + '/Bulb',
      idVirtDev + '/Dimmer State',
      idVirtDev + '/Led State',
      idVirtDev + '/Scene1',
      idVirtDev + '/Scene2',
    ],
    then: function (newValue, devName, cellName) {
      switch (cellName) {
        case 'Relay 1':
          switchRelay(1, newValue);
          break;
        case 'Relay 2':
          switchRelay(2, newValue);
          break;
        case 'Send Raw':
          try {
            writeWbTopic(idVirtDev, 'Status', ' ');
            sendCommand(JSON.parse(newValue));
          } catch (error) {
            writeWbTopic(idVirtDev, 'Status', '{}: {}'.format(error.name, error.message));
            log.error(error);
          }
          break;
        case 'Heat Icon':
          if (newValue > 0)
            sendCommand({
              warnings: [{ id: 1, type: wtype.heat, state: newValue }],
            });
          else sendCommand({ warnings: [{ id: 1, type: wtype.blank, state: 0 }] });
          break;
        case 'House Icon':
          if (newValue > 0)
            sendCommand({
              warnings: [{ id: 2, type: wtype.house, state: newValue }],
            });
          else sendCommand({ warnings: [{ id: 2, type: wtype.blank, state: 0 }] });
          break;
        case 'Motion Icon':
          if (newValue > 0)
            sendCommand({
              warnings: [{ id: 3, type: wtype.robot, state: newValue }],
            });
          else sendCommand({ warnings: [{ id: 3, type: wtype.blank, state: 0 }] });
          break;
        case 'Zap Icon':
          if (newValue > 0)
            sendCommand({
              warnings: [{ id: 4, type: wtype.zap, state: newValue }],
            });
          else sendCommand({ warnings: [{ id: 4, type: wtype.blank, state: 0 }] });
          break;
        case 'Therm State':
          sendCommand({
            sync: { pid: p.Therm, therm: { state: Number(newValue) } },
          });
          break;
        case 'Therm Heat':
          sendCommand({
            sync: { pid: p.Therm, therm: { heat: Number(newValue) } },
          });
          break;
        case 'Bulb':
          sendCommand({
            sync: {
              pid: p.Main,
              buttons: { bid: b.Bulb, state: Number(newValue) },
            },
          });
          break;
        case 'Dimmer State':
          sendCommand({
            sync: {
              pid: p.Main,
              buttons: { bid: b.Dimmer, state: Number(newValue) },
            },
          });
          break;
        case 'Led State':
          sendCommand({
            sync: {
              pid: p.Main,
              buttons: { bid: b.Led, state: Number(newValue) },
            },
          });
          break;
        case 'Scene1':
          sendCommand({
            sync: {
              pid: p.Main,
              buttons: { bid: b.Scene1, state: Number(newValue) },
            },
          });
          break;
        case 'Scene2':
          sendCommand({
            sync: {
              pid: p.Main,
              buttons: { bid: b.Scene2, state: Number(newValue) },
            },
          });
          break;
      }
    },
  });
}

// Actions with the virtual device to be done when changing panel controls
function action(data) {
  switch (data['pid']) {
    case p.Main: //{"button": {"pid": p.Main, "bid": 1, "state": 0, "next": 0}}
      switch (data['bid']) {
        case b.Bulb:
          writeWbTopic(idVirtDev, 'Bulb', Boolean(data['state']));
          break;
        case b.Scene1:
          writeWbTopic(idVirtDev, 'Scene1', Boolean(data['state']));
          break;
        case b.Scene2:
          writeWbTopic(idVirtDev, 'Scene2', Boolean(data['state']));
          break;
        default:
          break;
      }
    case p.Dimmer: //{"dimmer":{"pid":p.Dimmer,"power":1}}
      if ('power' in data) writeWbTopic(idVirtDev, 'Dimmer State', Boolean(data['power']));

      if ('dimmer' in data) writeWbTopic(idVirtDev, 'Dimmer Range', Number(data['dimmer']));
      break;
    case p.Led:
      if ('power' in data) writeWbTopic(idVirtDev, 'Led State', Boolean(data['power']));

      if ('hsbcolor' in data) {
        var arr = data['hsbcolor'].split(',');
        writeWbTopic(idVirtDev, 'Led Hue', Number(arr[0]));
        writeWbTopic(idVirtDev, 'Led Saturation', Number(arr[1]));
        writeWbTopic(idVirtDev, 'Led Brightness', Number(arr[2]));
      }
      break;
    case p.Therm:
      if ('state' in data) writeWbTopic(idVirtDev, 'Therm State', Boolean(data['state']));

      if ('heat' in data) writeWbTopic(idVirtDev, 'Therm Heat', Boolean(data['heat']));

      if ('set' in data) writeWbTopic(idVirtDev, 'Therm Set Temp', Number(data['set']));
      break;
  }
}

// Description of the pages that will be sent to the panel
function sendPage(pid, syncType) {
  var page = {};

  switch (pid) {
    case p.Main:
      page = {
        pid: p.Main,
        name: 'Main',
        format: 5,
        buttons: [
          {
            bid: b.Bulb,
            label: 'Bulb',
            type: btype.toggle,
            icon: bicns.bulb,
            state: Number(dev[idVirtDev]['Bulb']),
          },
          {
            bid: b.Dimmer,
            label: 'Dimmer',
            type: btype.dimmer,
            next: p.Dimmer,
            icon: bicns.dimmer,
            state: Number(dev[idVirtDev]['Dimmer State']),
          },
          {
            bid: b.Led,
            label: 'Led',
            type: btype.dimmer_color,
            next: p.Led,
            icon: bicns.dimmer_color,
            state: Number(dev[idVirtDev]['Led State']),
          },
          {
            bid: b.Therm,
            label: 'Therm',
            type: btype.page,
            next: p.Therm,
            state: pf.therm,
            icon: bicns.heat,
          },
          {
            bid: b.Scene1,
            label: 'Scene1',
            type: btype.toggle,
            icon: bicns.bed,
            state: Number(dev[idVirtDev]['Scene1']),
          },
          {
            bid: b.Scene2,
            label: 'Scene2',
            type: btype.toggle,
            icon: bicns.music,
            state: Number(dev[idVirtDev]['Scene2']),
          },
        ],
      };
      break;
    case p.Dimmer:
      page = {
        pid: p.Dimmer,
        format: pf.dimmer,
        name: 'Dimmer',
        min: 0,
        max: 100,
        icon: bicns.dimmer,
        power: Number(dev[idVirtDev]['Dimmer State']),
        dimmer: dev[idVirtDev]['Dimmer Range'],
      };
      break;
    case p.Led:
      page = {
        pid: p.Led,
        format: pf.dimmer_color,
        name: 'Led',
        power: Number(dev[idVirtDev]['Led State']),
        icon: bicns.dimmer_color,
        hsbcolor: '{},{},{}'.format(
          dev[idVirtDev]['Led Hue'],
          dev[idVirtDev]['Led Saturation'],
          dev[idVirtDev]['Led Brightness']
        ),
      };
      break;
    case p.Therm:
      page = {
        pid: p.Therm,
        format: pf.therm,
        name: 'Therm',
        therm: {
          set: dev[idVirtDev]['Therm Set Temp'],
          temp: dev[idVirtDev]['Therm Room Temp'],
          heat: Number(dev[idVirtDev]['Therm Heat']),
          state: Number(dev[idVirtDev]['Therm State']),
        },
      };
      break;
  }

  if (syncType == 'refresh') {
    sendCommand({ refresh: page });
    if (pid == p.Main)
      // a crutch to close the bug with status updates for the page under the swipe
      sendCommand({ sync: page });
  } else sendCommand({ sync: page });
}

/** Service Functions */

function initTracking() {
  trackMqtt('tele/{}/RESULT'.format(idTasmota), function (message) {
    checkPanel();

    obj = JSON.parse(message.value);

    for (key in obj) {
      switch (key) {
        case 'init':
          initPanel();
          break;
        case 'page':
          sendPage(obj[key]['pid'], obj[key]['type']);
          break;
        case 'button':
        case 'dimmer':
        case 'therm':
          action(obj[key]);
        default:
          break;
      }
    }
  });

  // Subscribing to physical button events
  trackMqtt('stat/{}/RESULT'.format(idTasmota), function (message) {
    checkPanel();

    var obj = JSON.parse(message.value);
    for (key in obj) {
      switch (key) {
        case 'POWER1':
          writeWbTopic(idVirtDev, 'Relay 1', obj[key] == 'ON' ? true : false);
          break;
        case 'POWER2':
          writeWbTopic(idVirtDev, 'Relay 2', obj[key] == 'ON' ? true : false);
          break;
        default:
          writeWbTopic(idVirtDev, 'Status', message.value);
          break;
      }
    }
  });

  // Subscription to sensors
  trackMqtt('tele/{}/SENSOR'.format(idTasmota), function (message) {
    checkPanel();

    var obj = JSON.parse(message.value);

    for (key in obj) {
      switch (key) {
        case 'Time':
          writeWbTopic(idVirtDev, 'Panel Time', obj[key]);
          break;
        case 'ANALOG':
          var newValue = obj[key]['Temperature1'];
          writeWbTopic(idVirtDev, 'Room Temp', Number(newValue));
          writeWbTopic(idVirtDev, 'Therm Room Temp', Number(newValue));

          sendCommand({ sync: { pid: p.Therm, therm: { temp: newValue } } });
          sendCommand({
            summary: { title: '{} °C'.format(newValue), text: 'Room' },
          });
          break;
        case 'ESP32':
          writeWbTopic(idVirtDev, 'ESP32 Temp', obj[key]['Temperature']);
          break;
        default:
          // log.debug("[{}] eventSensors: {}", idPanel, event)
          break;
      }
    }
  });

  // Monitoring of disconnection with the panel
  defineRule({
    when: cron('@every 5m'),
    then: function () {
      if (getDateNow() - lastSeen > 5 * 60 * 1000) setIsInitialized(false);
    },
  });
}

function checkPanel() {
  if (!panelIsInitialized) initPanel();
  lastSeen = getDateNow();
}

function getDateNow() {
  return new Date();
}

function setIsInitialized(status) {
  panelIsInitialized = status;
  writeWbTopic(idVirtDev, 'Initialized', status);
}

function sendCommand(cmdObj) {
  // log(JSON.stringify(cmdObj))
  publish('cmnd/{}/nxpanel'.format(idTasmota), JSON.stringify(cmdObj), 2);
}

function writeWbTopic(devName, cellName, newValue) {
  getDevice(devName).getControl(cellName).setValue({ value: newValue, notify: true });
}

// Working with physical panel devices: relay and buzzer.
function switchRelay(relay, newValue) {
  value = newValue ? 'ON' : 'OFF';

  publish('cmnd/{}/nspsend/POWER{}'.format(idTasmota, relay), value, 2);
}

function setBuzzer(count, beep, silence, tune) {
  var value = '';
  value = value + count;

  if (beep != undefined) value = value + ',' + beep;
  if (silence != undefined) value = value + ',' + silence;
  if (tune != undefined) value = value + ',' + tune;

  publish('cmnd/{}/nspsend/BUZZER'.format(idTasmota), value, 2);
}

// Constants of icons, page types and buttons. So as not to remember.
function initConst() {
  pf = {
    home: 1,
    buttons2: 2,
    buttons3: 3,
    buttons4: 4,
    buttons6: 5,
    buttons8: 6,
    dimmer: 7,
    dimmer_color: 8,
    therm: 9,
    alert1: 10,
    alert2: 11,
    alarm: 12,
    media: 13,
    playlist: 14,
    status: 15,
  };

  btype = {
    unused: 0,
    toggle: 1,
    push: 2,
    dimmer: 3,
    dimmer_color: 4,
    page: 10,
  };

  bicns = {
    blank: 0,
    bulb: 1,
    dimmer: 2,
    dimmer_color: 3,
    vacuum: 4,
    bed: 5,
    house: 6,
    sofa: 7,
    bell: 8,
    heat: 9,
    curtains: 10,
    music: 11,
    binary: 12,
    fan: 13,
    switch: 14,
    talk: 15,
    info: 16,
  };

  wtype = {
    blank: 0,
    heat: 1,
    house: 2,
    light: 3,
    plug: 4,
    robot: 5,
    speaker: 6,
    zap: 7,
    bustbin: 8,
  };

  wcolor = {
    none: 0,
    white: 1,
    red: 2,
    blue: 3,
  };

  weather_icons = {
    clear_sky: '01d',
    few_clouds: '02d',
    scatted_clouds: '03d',
    broken_clouds: '04d',
    shower_rain: '09d',
    rain: '10d',
    thunderstorm: '11d',
    snow: '13d',
    mist: '50d',
  };
}

exports.init = function (deviceName, tasmotaName) {
  init(deviceName, tasmotaName);
};
