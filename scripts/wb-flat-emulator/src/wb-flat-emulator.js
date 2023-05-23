var devTitle = "Моя квартира";
var devName = "my-floor";
var emulator = true;

// Описание комнат, задаётся пользователем
var rooms = {
  hall: {
    title: "Холл",
    devices: ["temperature", "humidity", "co2", "motion", "light"],
  },
  kitchen: {
    title: "Кухня",
    devices: [
      "temperature",
      "humidity",
      "co2",
      "motion",
      "window",
      "ac",
      "light",
    ],
  },
  bathroom: {
    title: "Санузел",
    devices: ["temperature", "humidity", "co2", "motion", "fan", "light"],
  },
  breadroom: {
    title: "Спальня",
    devices: [
      "temperature",
      "humidity",
      "co2",
      "motion",
      "window",
      "ac",
      "light",
    ],
  },
  questroom: {
    title: "Зал",
    devices: [
      "temperature",
      "humidity",
      "co2",
      "motion",
      "window",
      "ac",
      "light",
    ],
  },
  service: {
    title: "Счетчик",
    devices: ["counter_water", "counter_electro", "counter_gas"],
  },
};

/* ------------------------------ */
/* Служебные функции, не менять   */
/* ------------------------------ */

// Прототипы контролов
var proto = {
  temperature: {
    title: "{}: температура",
    type: "value",
    value: 20.5,
    units: "°C",
  },
  humidity: {
    title: "{}: влажность",
    type: "value",
    value: 40,
    units: "%, RH",
  },
  co2: {
    title: "{}: CO2",
    type: "value",
    value: 850,
    units: "ppm",
  },
  voc: {
    title: "{}: VOC",
    type: "value",
    value: 850,
    units: "ppb",
  },
  counter_water: {
    title: "{}: воды",
    type: "value",
    value: 125,
    units: "м3",
  },
  counter_electro: {
    title: "{}: эл.",
    type: "value",
    value: 390,
    units: "кВт/ч",
  },
  counter_gas: {
    title: "{}: газа",
    type: "value",
    value: 680,
    units: "м3",
  },
  motion: {
    title: "{}: движение",
    type: "switch",
    value: false,
  },
  window: {
    title: "{}: окно",
    type: "switch",
    value: false,
  },
  ac: {
    title: "{}: кондиционер",
    type: "switch",
    value: false,
    readonly: false,
  },
  fan: {
    title: "{}: вытяжка",
    type: "switch",
    value: false,
    readonly: false,
  },
  light: {
    title: "{}: свет",
    type: "switch",
    value: false,
    readonly: false,
  },
};

var virtualDevice = defineVirtualDevice(devName, {
  title: devTitle,
  cells: {},
});

// Инициализация
init();

function init() {
  var order = 1;
  for (key in rooms) {
    var title = rooms[key].title;
    var devices = rooms[key].devices;

    devices.forEach(function (item) {
      var controlProto = proto[item];
      var readonly =
        controlProto.readonly != undefined ? controlProto.readonly : true;

      virtualDevice.addControl("{}_{}".format(key, item), {
        title: controlProto.title.format(title),
        type: controlProto.type,
        value: controlProto.value,
        units: controlProto.units,
        readonly: readonly,
        order: order,
      });

      order += 1;
    });
  }
  if (emulator) {
    emulatorInit();
  }
}

// Эмулятор значений
function emulatorInit() {
  startTicker("sys_timer", 4000);
}

defineRule("sys-timer-tick", {
  when: function () {
    return timers.sys_timer.firing;
  },
  then: function () {
    emulatorSetValues();
  },
});

function emulatorSetValues() {
  getDevice(devName)
    .controlsList()
    .forEach(function (ctrl) {
      var ctrlType = ctrl.getType();

      switch (ctrlType) {
        case "value":
          setValue(ctrl);
          break;

        case "switch":
          setSwitch(ctrl);
          break;

        default:
          break;
      }
    });
}

function setValue(ctrl) {
  var ctrlId = ctrl.getId();
  var lastValue = ctrl.getValue();

  if (ctrlId.indexOf("co2") >= 0 || ctrlId.indexOf("voc") >= 0) {
    ctrl.setValue(genNextNumberValue(lastValue, 450, 2000, 1));
  } else {
    if (
      ctrlId.indexOf("counter_water") >= 0 ||
      ctrlId.indexOf("counter_electro") >= 0 ||
      ctrlId.indexOf("counter_gas") >= 0
    ) {
      ctrl.setValue(genNextNumberValue(lastValue, lastValue, 99999999999, 1));
    } else {
      ctrl.setValue(genNextNumberValue(lastValue, 15, 45, 100));
    }
  }
}

function setSwitch(ctrl) {
  if (ctrl.getReadonly()) {
    ctrl.setValue(genSwitchState());
  }
}

// Генерирует новое случайное значение, которое отличается от предыдущего на 3 %
function genNextNumberValue(lastValue, min, max, precision) {
  var precision = precision != undefined ? precision : 1;

  var value = lastValue + (max - min) * (Math.random() - 0.5) * 0.03;
  value = Math.max(min, Math.min(max, value));
  return Math.round(value * precision) / precision;
}

// Бросает монетку — использую для свяких дискретных сигналов
function genSwitchState() {
  return Math.random() < 0.5 ? false : true;
}
