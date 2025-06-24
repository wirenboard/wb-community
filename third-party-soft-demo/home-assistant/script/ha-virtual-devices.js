var emulator = require("device-emulator"); // подключаем модуль
var devices = [ // описываем устройства
    {
        "type": "WB-MAP3E",
        "address": 12,
        "emulators": [
            { "topicName": "Irms L1", "type": "sensor2Dec", "name": "Irms L1", "lastValue": 390, "min": 380, "max": 420, "interval": 3000 }, // interval (ms) >=1000 ms
            { "topicName": "Urms L1", "type": "sensor2Dec", "name": "Urms L1", "lastValue": 220, "min": 210, "max": 225, "interval": 3000 },
            { "topicName": "Phase angle L1", "type": "sensor2Dec", "name": "Phase angle L1", "lastValue": 5.05, "min": 4.80, "max": 5.10, "interval": 3000 },
            { "topicName": "Voltage angle L1", "type": "sensor2Dec", "name": "Phase angle L1", "lastValue": 0, "min": 0, "max": 0, "interval": 3000 },

            { "topicName": "Irms L2", "type": "sensor2Dec", "name": "Irms L2", "lastValue": 370, "min": 350, "max": 390, "interval": 3000 },
            { "topicName": "Urms L2", "type": "sensor2Dec", "name": "Urms L2", "lastValue": 222, "min": 210, "max": 225, "interval": 3000 },
            { "topicName": "Phase angle L2", "type": "sensor2Dec", "name": "Phase angle L2", "lastValue": 5.07, "min": 4.80, "max": 5.10, "interval": 3000 },
            { "topicName": "Voltage angle L2", "type": "sensor2Dec", "name": "Phase angle L2", "lastValue": 120, "min": 118, "max": 122, "interval": 3000 },

            { "topicName": "Irms L3", "type": "sensor2Dec", "name": "Irms L3", "lastValue": 420, "min": 400, "max": 440, "interval": 3000 },
            { "topicName": "Urms L3", "type": "sensor2Dec", "name": "Urms L3", "lastValue": 219, "min": 210, "max": 225, "interval": 3000 },
            { "topicName": "Phase angle L3", "type": "sensor2Dec", "name": "Phase angle L3", "lastValue": 5.04, "min": 4.80, "max": 5.10, "interval": 3000 },

            { "topicName": "Frequency", "type": "sensor2Dec", "name": "Frequency", "lastValue": 50, "min": 49, "max": 51, "interval": 3000 },
        ]
    },
    {
        "type": "WB-MR6C",
        "address": 32,
        "emulators": [
        ]
    },
    {
        "type": "WB-MDM3",
        "address": 42,
        "emulators": [
        ]
    },
    {
        "type": "WB-MSW v.3",
        "address": 52,
        "emulators": [
            { "topicName": "Temperature", "type": "sensor2Dec", "name": "Bathroom Temperature", "lastValue": 28, "min": 20, "max": 30, "interval": 10000 }, // interval (ms) >=1000 ms
            { "topicName": "Humidity", "type": "sensor2Dec", "name": "Bathroom Humidity", "lastValue": 65, "min": 10, "max": 80, "interval": 10000 },
            { "topicName": "VOC", "type": "sensor0Dec", "name": "Bathroom VOC", "lastValue": 900, "min": 500, "max": 4000, "interval": 10000 },
            { "topicName": "CO2", "type": "sensor0Dec", "name": "Bathroom CO2", "lastValue": 1200, "min": 450, "max": 2000, "interval": 10000 },
            { "topicName": "Noise", "type": "sensor2Dec", "name": "Bathroom Noise", "lastValue": 70, "min": 38, "max": 105, "interval": 3000 },
            { "topicName": "Illuminance", "type": "sensor2Dec", "name": "Bathroom Illuminance", "lastValue": 12, "min": 0, "max": 123, "interval": 3000 },
        ]
    },
]

init()

function init() {
    emulator.init(devices);
    // задаём какие-то начальные значения для первого счётчика
    emulator.publishValue("wb-map3e_12", "AP energy L1", 1250.120)
    emulator.publishValue("wb-map3e_12", "AP energy L2", 4843.150)
    emulator.publishValue("wb-map3e_12", "AP energy L3", 1489.190)

    emulator.publishValue("wb-map3e_12", "RP energy L1", 120.600)
    emulator.publishValue("wb-map3e_12", "RP energy L2", 450.130)
    emulator.publishValue("wb-map3e_12", "RP energy L3", 35.520)

    // Инициализация реле, потом надо перетащить в эмулятор
    emulator.publishValue("wb-mr6c_32", "K1", 1)
    emulator.publishValue("wb-mr6c_32", "K2", 1)
    emulator.publishValue("wb-mr6c_32", "K3", 1)
    emulator.publishValue("wb-mr6c_32", "K4", 1)
    emulator.publishValue("wb-mr6c_32", "K5", 1)
    emulator.publishValue("wb-mr6c_32", "K6", 0)

    emulator.publishValue("wb-mdm3_42", "K1", 1)
    emulator.publishValue("wb-mdm3_42", "Channel 1", 100)
    emulator.publishValue("wb-mdm3_42", "K2", 0)
    emulator.publishValue("wb-mdm3_42", "Channel 2", 50)
    emulator.publishValue("wb-mdm3_42", "K3", 1)
    emulator.publishValue("wb-mdm3_42", "Channel 3", 25)
}
