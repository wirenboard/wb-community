defineVirtualDevice("password_converter", {
    title: "Password Converter",
    cells: {
        "PasswordString": {
            type: "text",
            value: "",
            readonly: false,
            order: 1
        },
        "PasswordBytes": {
            type: "text",
            value: "",
            readonly: true,
            order: 2
        },
        "ConvertButton": {
            type: "pushbutton",
            order: 3
        }
    }
});

defineRule("clearBytesOnStringInput", {
    whenChanged: "password_converter/PasswordString",
    then: function () {
        // Очищаем поле PasswordBytes
        dev["password_converter"]["PasswordBytes"] = "";
    }
});

defineRule("convertPasswordOnButtonPress", {
    when: function () {
        return dev["password_converter"]["ConvertButton"];
    },
    then: function () {
        var passwordString = dev["password_converter"]["PasswordString"];
        var passwordBytes = [];

        for (var i = 0; i < passwordString.length; i++) {
            passwordBytes.push("0x" + passwordString.charCodeAt(i).toString(16).toUpperCase());
        }

        var passwordBytesString = passwordBytes.join(", ");

        // Записываем результат в поле PasswordBytes
        dev["password_converter"]["PasswordBytes"] = passwordBytesString;

        // Выводим результат в лог
        log.info("Password converted to bytes: " + passwordBytesString);
    }
});
