// Создание виртуального устройства
defineVirtualDevice('ir_controller', {
    title: 'IR Controller',
    cells: {
        // Основные настройки
        'Device Friendly Name': {
            type: 'text', // Тип текстового поля
            value: '', // Название устройства
            readonly: false, // Разрешить запись
            order: 1, // Ставим имя первым
        },
        // ROM управление
        'ROM Slot': {
            type: 'value', // Тип value для номера ячейки
            value: 0, // Значение по умолчанию
            order: 2, // Указываем номер ячейки первым в группе ROM
            readonly: false, // Разрешить запись
        },
        'Learn ROM Start': {
            type: 'pushbutton', // Кнопка для начала обучения ROM
            order: 3, // Следующая операция
        },
        'Learn ROM Stop': {
            type: 'pushbutton', // Кнопка для завершения обучения ROM
            order: 4,
        },
        'Play ROM Signal': {
            type: 'pushbutton', // Кнопка для воспроизведения сигнала ROM
            order: 5,
        },
        'Clear ROM': {
            type: 'pushbutton', // Кнопка для очистки ROM
            order: 6,
        },
        // RAM управление
        'Learn RAM Start': {
            type: 'pushbutton', // Кнопка для начала обучения RAM
            order: 7, // RAM управление после ROM
        },
        'Learn RAM Stop': {
            type: 'pushbutton', // Кнопка для завершения обучения RAM
            order: 8,
        },
        'Play RAM Signal': {
            type: 'pushbutton', // Кнопка для воспроизведения сигнала RAM
            order: 9,
        },
    },
});


// Функция отправки MQTT-команды
function sendMQTTCommand(deviceName, command, payload) {
    if (deviceName) {
        var message = {}; // Создание объекта команды
        message[command] = payload; // Динамическое добавление команды
        publish(
            'zigbee2mqtt/' + deviceName + '/set',
            JSON.stringify(message),
                2,
                false
        );
        log('Command sent: ' + command + ', Payload: ' + JSON.stringify(payload));
    } else {
        log('Error: Device name is empty.');
    }
}

// Правила для ROM
defineRule('learn_rom_start', {
    whenChanged: 'ir_controller/Learn ROM Start',
    then: function () {
        var deviceName = dev['ir_controller']['Device Friendly Name'];
        var romSlot = dev['ir_controller']['ROM Slot'];
        sendMQTTCommand(deviceName, 'learn_start', { rom: romSlot });
    },
});

defineRule('learn_rom_stop', {
    whenChanged: 'ir_controller/Learn ROM Stop',
    then: function () {
        var deviceName = dev['ir_controller']['Device Friendly Name'];
        var romSlot = dev['ir_controller']['ROM Slot'];
        sendMQTTCommand(deviceName, 'learn_stop', { rom: romSlot });
    },
});

defineRule('play_rom_signal', {
    whenChanged: 'ir_controller/Play ROM Signal',
    then: function () {
        var deviceName = dev['ir_controller']['Device Friendly Name'];
        var romSlot = dev['ir_controller']['ROM Slot'];
        sendMQTTCommand(deviceName, 'play_store', { rom: romSlot });
    },
});

defineRule('clear_rom', {
    whenChanged: 'ir_controller/Clear ROM',
    then: function () {
        var deviceName = dev['ir_controller']['Device Friendly Name'];
        sendMQTTCommand(deviceName, 'clear_store', {});
    },
});

// Правила для RAM
defineRule('learn_ram_start', {
    whenChanged: 'ir_controller/Learn RAM Start',
    then: function () {
        var deviceName = dev['ir_controller']['Device Friendly Name'];
        sendMQTTCommand(deviceName, 'learn_ram_start', {});
    },
});

defineRule('learn_ram_stop', {
    whenChanged: 'ir_controller/Learn RAM Stop',
    then: function () {
        var deviceName = dev['ir_controller']['Device Friendly Name'];
        sendMQTTCommand(deviceName, 'learn_ram_stop', {});
    },
});

defineRule('play_ram_signal', {
    whenChanged: 'ir_controller/Play RAM Signal',
    then: function () {
        var deviceName = dev['ir_controller']['Device Friendly Name'];
        sendMQTTCommand(deviceName, 'play_ram', {});
    },
});
