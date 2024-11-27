// Правило для получения данных из Sprut.hub'а в Wiren Board.
// В правиле реализована возможность добавления только WB-MSW-ZIGBEE v4.

// Наименование моста в Sprut.hub'е.
var SH_Bridge_Name = 'Sprut.hub-to-WB';

// Массив наименований аксессуаров в Sprut.hub'е. Заполнить актуальными значениями.
var SH_Device_Name = ['78',
                      '80',
                      '81',
                      '82',
                      '83',
                      '84'];

// Массив наименований виртуальных устройств в Wiren Board. Заполнить актуальными значениями.
var VD_Name = ['VD_7CC6B6FFFE5F6E73',
               'VD_94B216FFFEF225DE',
               'VD_7CC6B6FFFE5F5B79',
               'VD_94B216FFFEF20152',
               'VD_04CD15FFFEA0B5DD',
               'VD_04CD15FFFEA0B687'];

if (SH_Device_Name.length != VD_Name.length) {
  log.info('incorrectly defined device arrays');
}

var Device_Name = 'WB-MSW';
var VD_array = [];
var SH_trackMqtt_array = [];

// Функция создания виртуального устройства
function VirtualDevice(VD_Name) {
  defineVirtualDevice(VD_Name, {
    title: VD_Name,
    cells: {
      accessory: {
        title: {en: 'Accessory', ru: 'Аксессуар'},
        type: 'text',
        order: 1,
        value: ''
      },
      temperature: {
        title: {en: 'Temperature', ru: 'Температура'},
        type: 'value',
        units: 'deg C',
        order: 2,
        value: -1
      },
      humidity: {
        title: {en: 'Humidity', ru: 'Влажность'},
        type: 'value',
        units: '%, RH',
        order: 3,
        value: -1
      },
      co2: {
        title: {en: 'CO2', ru: 'CO2'},
        type: 'value',
        units: 'ppm',
        order: 4,
        value: -1
      },
      illuminance_lux: {
        title: {en: 'Illuminance', ru: 'Освещенность'},
        type: 'value',
        units: 'lx',
        order: 5,
        value: -1
      },
      noise: {
        title: {en: 'Noise', ru: 'Шум'},
        type: 'switch',
        readonly: true,
        order: 6,
        value: false
      },
      occupancy: {
        title: {en: 'Occupancy', ru: 'Движение'},
        type: 'switch',
        readonly: true,
        order: 7,
        value: -1
      },
    }
});
}
// Функция проверки значения топика на json-структуру
function isJson(str) {
  if (typeof str !== 'string') return false;
  try {
    var result = JSON.parse(str);
    var type = Object.prototype.toString.call(result);
    return type === '[object Object]' || type === '[object Array]';
  } catch (e) {
    return false;
  }
}
// Функция подписки на типики Sprut.hub'а
function SH_trackMqtt(SH_Bridge_Name, SH_Device_Name, VD_Name) {
  trackMqtt(SH_Bridge_Name + '/accessories/' + SH_Device_Name + '/1/6', function(message) {
    if (isJson(message.value)) {
      dev[VD_Name + '/accessory'] = JSON.parse(message.value).value;;
    }
    else {
      dev[VD_Name + '/accessory'] = message.value;
    }
  });
  if (dev[VD_Name + '/accessory'] == 'WB-MSW') {
    trackMqtt(SH_Bridge_Name + '/accessories/' + SH_Device_Name + '/20/22', function(message) {
      if (isJson(message.value)) {
        dev[VD_Name + '/temperature'] = JSON.parse(message.value).value;
      }
      else {
        dev[VD_Name + '/temperature'] = Number(message.value);
      }
    });
    trackMqtt(SH_Bridge_Name + '/accessories/' + SH_Device_Name + '/23/25', function(message) {
      if (isJson(message.value)) {
        dev[VD_Name + '/humidity'] = JSON.parse(message.value).value;
      }
      else {
        dev[VD_Name + '/humidity'] = Number(message.value);
      }
    });
    trackMqtt(SH_Bridge_Name + '/accessories/' + SH_Device_Name + '/29/32', function(message) {
      if (isJson(message.value)) {
        dev[VD_Name + '/co2'] = JSON.parse(message.value).value;
      }
      else {
        dev[VD_Name + '/co2'] = Number(message.value);
      }
    });
    trackMqtt(SH_Bridge_Name + '/accessories/' + SH_Device_Name + '/26/28', function(message) {
      if (isJson(message.value)) {
        dev[VD_Name + '/illuminance_lux'] = JSON.parse(message.value).value;
      }
      else {
        dev[VD_Name + '/illuminance_lux'] = Number(message.value);
      }
    });
    trackMqtt(SH_Bridge_Name + '/accessories/' + SH_Device_Name + '/37/39', function(message) {
      if (isJson(message.value)) {
        dev[VD_Name + '/noise'] = Boolean(JSON.parse(message.value).value);
      }
      else {
        dev[VD_Name + '/noise'] = Boolean(Number(message.value));
      }
    });
    trackMqtt(SH_Bridge_Name + '/accessories/' + SH_Device_Name + '/13/15', function(message) {
      if (isJson(message.value)) {
        dev[VD_Name + '/occupancy'] = JSON.parse(message.value).value;
      }
      else {
        dev[VD_Name + '/occupancy'] = (message.value === 'true');
      }
    });
  }
}
// Создание виртуальных устройств Wiren Board и подписка на акссессуары Sprut.hub'а.
for (index = 0, len = SH_Device_Name.length; index < len; ++index) {
  VD_array[index] = VirtualDevice(VD_Name[index]);
  log.info('virtual device {} is created'.format(VD_Name[index]));
  SH_trackMqtt_array[index] = SH_trackMqtt(SH_Bridge_Name, SH_Device_Name[index], VD_Name[index]);
  if ((dev[VD_Name[index] + '/accessory'] != Device_Name)) {
    str = 'mqtt-delete-retained \'/devices/' + VD_Name[index] + '/#\'';
    runShellCommand(str);
    delete VD_array[index];
    delete SH_trackMqtt_array[index];
    log.info('virtual device {} deleted'.format(VD_Name[index]));
  }
}
