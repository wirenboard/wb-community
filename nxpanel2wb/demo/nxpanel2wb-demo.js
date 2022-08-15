var panel = require("nxpanel2wb");
panel.init("ns-panel", "tasmota_C846D4") // deviceName, tasmotaName

// Monitoring panel controls
defineRule({
    whenChanged: [
        "ns-panel/Bulb",
        "ns-panel/Led State",
        "ns-panel/Led Hue",
        "ns-panel/Led Saturation",
        "ns-panel/Led Brightness",
        "ns-panel/Scene1",
        "ns-panel/Scene2"

    ],
    then: function (newValue, devName, cellName) {
        switch (cellName) {
            case "Bulb":
                dev["wb-mrwm2_64/K1"] = newValue
                break
            case "Led State":
                dev["wb-led_21/RGB Strip"] = newValue
                break
            case "Led Hue":
                dev["wb-led_21/RGB Strip Hue"] = newValue
                break
            case "Led Saturation":
                dev["wb-led_21/RGB Strip Saturation"] = newValue
                break
            case "Led Brightness":
                dev["wb-led_21/RGB Strip Brightness"] = newValue
                break
            case "Scene1":
                if (newValue == true){
                    dev["ns-panel/Scene2"] = false
                    dev["ns-panel/Bulb"] = false
                    dev["ns-panel/Led State"] = false
                    dev["ns-panel/Dimmer State"] = false
                }
                break
            case "Scene2":
                if (newValue == true) {
                    dev["ns-panel/Scene1"] = !newValue
                    dev["ns-panel/Bulb"] = !newValue
                    dev["ns-panel/Led State"] = newValue
                    dev["ns-panel/Led Hue"] = 237
                    dev["ns-panel/Led Brightness"] = 55
                }
                break

        }
    }
});

// Monitoring of physical device controls
defineRule({
    whenChanged: [
        "wb-mrwm2_64/K1",
        "wb-led_21/RGB Strip",
        "wb-led_21/RGB Strip Hue",
        "wb-led_21/RGB Strip Saturation",
        "wb-led_21/RGB Strip Brightness",

    ],
    then: function (newValue, devName, cellName) {
        switch (cellName) {
            case "K1":
                dev["ns-panel/Bulb"] = newValue
                break
            case "RGB Strip":
                dev["ns-panel/Led State"] = newValue
                break
            case "RGB Strip Hue":
                dev["ns-panel/Led Hue"] = newValue
                break
            case "RGB Strip Saturation":
                dev["ns-panel/Led Saturation"] = newValue
                break
            case "RGB Strip Brightness":
                dev["ns-panel/Led Brightness"] = newValue
                break

        }
    }
});

// Weather
defineRule({
    when: cron("@every 15m"),
    then: function () {
        updateWeather()
    }
});

updateWeather()

function updateWeather() {
    runShellCommand("curl wttr.in/Astrakhan?format=j1", { //Detroit
        captureOutput: true,
        captureErrorOutput: true,
        exitCallback: function (exitCode, capturedOutput, capturedErrorOutput) {
            //sendCommand({ "weather": { "temp": 30, "icon": "02d", "feels": 35, "summary": "40 %,RH" } })
            try {
                var weather = JSON.parse(capturedOutput)
                dev["ns-panel/Send Raw"] = JSON.stringify(
                    {
                        "weather": {
                            temp: weather["current_condition"][0]["temp_C"],
                            icon: getWeatherIcon(weather["current_condition"][0]["weatherCode"]),
                            feels: weather["current_condition"][0]["FeelsLikeC"],
                            summary: "{} %,RH".format(weather["current_condition"][0]["humidity"])
                        }
                    }
                )
                return
            } catch (error) {
                log(error)
            }
        }
    });
}

function getWeatherIcon(weatherCode) {
    switch (weatherCode) {
        case 113:
            return "01d"
        case 116:
            return "02d"
        case 119:
            return "03d"
        case 122:
            return "04d"
        case 176:
        case 179:
        case 263:
        case 299:
        case 305:
        case 353:
        case 356:
        case 362:
        case 365:
        case 374:
            return "09d"
        case 182:
        case 185:
        case 302:
        case 308:
        case 359:
        case 266:
        case 281:
        case 284:
        case 293:
        case 296:
        case 311:
        case 314:
        case 317:
        case 320:
        case 350:
        case 377:
            return "10d"
        case 200:
        case 386:
        case 389:
        case 392:
            return "11d"
        case 227:
        case 230:
        case 329:
        case 332:
        case 335:
        case 338:
        case 368:
        case 371:
        case 395:
        case 323:
        case 326:
            return "13d"
        case 143:
        case 248:
        case 260:
            return "50d"

    }
}


