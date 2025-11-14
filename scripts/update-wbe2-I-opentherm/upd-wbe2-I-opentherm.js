defineVirtualDevice("Nevoton-Boiler-Gate", {
    title: "Nevoton Boiler Gate",
    cells: {
        Status: {
            title: "",
            type: "text",
            value: "",
            order: 1,
            forceDefault: true,
        },
        Slot: {
            title: "Module slot: ",
            type: "text",
            value: "MOD1",
            readonly: false,
            order: 2,
            forceDefault: true,
        },
        Device_info: {
            title: "Device: ",
            type: "text",
            value: "undefined",
            order: 3,
            forceDefault: true,
            // readonly: false,
        },
        CheckFirmwareVersion: {
            type: "pushbutton",
            title: "Check installed firmware version and device info",
            order: 4,
            forceDefault: true,
        },
        VersionFirmwareCurrent: {
            title: "Current firmware version",
            type: "text",
            value: "undefined",
            order: 5,
            forceDefault: true,
        },
        VersionFirmwareLatest: {
            title: "Latest available firmware version",
            type: "text",
            value: "undefined",
            order: 6,
            forceDefault: true,
        },
        Update: {
            type: "pushbutton",
            title: "Install/Update firmware",
            order: 7,
            forceDefault: true,
        },
    }
});

function hide_buttons() {
    // getControl("Nevoton-Boiler-Gate/Update").setType("text");
    // getControl("Nevoton-Boiler-Gate/Update").setValue("");
    // getControl("Nevoton-Boiler-Gate/Update").setTitle("");
    // getControl("Nevoton-Boiler-Gate/CheckFirmwareVersion").setType("text");
    // getControl("Nevoton-Boiler-Gate/CheckFirmwareVersion").setValue("");
    // getControl("Nevoton-Boiler-Gate/CheckFirmwareVersion").setTitle("");
    // addControl("Nevoton-Boiler-Gate/cunt", {type: "pushbutton", title: "cunt", order: 8, forceDefault: true,});
    getControl("Nevoton-Boiler-Gate/Slot").setReadonly(true);
    getDevice("Nevoton-Boiler-Gate").removeControl("Update");
    getDevice("Nevoton-Boiler-Gate").removeControl("CheckFirmwareVersion");
}

function show_buttons() {
    // getControl("Nevoton-Boiler-Gate/Update").setType("pushbutton");
    // getControl("Nevoton-Boiler-Gate/Update").setTitle("Install/Update firmware");
    // getControl("Nevoton-Boiler-Gate/CheckFirmwareVersion").setType("pushbutton");
    // getControl("Nevoton-Boiler-Gate/CheckFirmwareVersion").setTitle("Check installed firmware version and device info");
    getControl("Nevoton-Boiler-Gate/Slot").setReadonly(false);
    if (!getDevice("Nevoton-Boiler-Gate").isControlExists("CheckFirmwareVersion")) { getDevice("Nevoton-Boiler-Gate").addControl("CheckFirmwareVersion", { type: "pushbutton", title: "Check installed firmware version and device info", order: 4, forceDefault: true, }) }
    if (!getDevice("Nevoton-Boiler-Gate").isControlExists("Update")) { getDevice("Nevoton-Boiler-Gate").addControl("Update", { type: "pushbutton", title: "Install/Update firmware", order: 7, forceDefault: true, }) }
}

function show_Status(new_status) {
    // getControl("Nevoton-Boiler-Gate/Status").setTitle("Status:");
    getControl("Nevoton-Boiler-Gate/Status").setValue(new_status);
}

function hide_Status() {
    getControl("Nevoton-Boiler-Gate/Status").setTitle("");
    getControl("Nevoton-Boiler-Gate/Status").setValue("");
}

function error_device_unknown() {
    getControl("Nevoton-Boiler-Gate/Status").setTitle("");
    getControl("Nevoton-Boiler-Gate/Device_info").setValue("unknown");
    getControl("Nevoton-Boiler-Gate/VersionFirmwareCurrent").setValue("unknown");
    getControl("Nevoton-Boiler-Gate/VersionFirmwareLatest").setValue("unknown");
    getControl("Nevoton-Boiler-Gate/Device_info").setReadonly(false);
    show_Status("Error! Type in device:\n 1 for OpenTherm-Modbus-WB or 2 for eBus-Modbus-WB, or ... to try again");
    show_buttons();
}

function download_archive_and_script(command) {
    // runShellCommand("wget -O /home/nevoton_gate/nvt_lin.tar --no-check-certificate -P /home/nevoton_gate 'https://gitlab.nevoton.ru/kuliev/FirmwareWIRENBOARD/-/raw/484fc76eddf29d3d145dea5ccde7f5425667cf14/nvt_lin.tar?inline=false'", {
    runShellCommand("mkdir -p /home/nevoton_gate && wget -O /home/nevoton_gate/nvt_lin.tar --no-check-certificate -P /home/nevoton_gate 'https://gitlab.nevoton.ru/kuliev/FirmwareWIRENBOARD/-/raw/master/nvt_lin.tar?inline=false' && wget -O /home/nevoton_gate/script.sh --no-check-certificate -P /home/nevoton_gate 'https://gitlab.nevoton.ru/kuliev/FirmwareWIRENBOARD/-/raw/wirenboard_files/burn.sh?ref_type=heads&inline=false'", {
        captureOutput: true,
        exitCallback: function (exitCode, capturedOutput) {
            log.info("download_archive_and_script exitCode: " + String(exitCode));
            if (String(exitCode) == "0") {
                runShellCommand("cd /home/nevoton_gate && tar --overwrite -xf nvt_lin.tar", {
                    captureOutput: true,
                    exitCallback: function (exitCode, capturedOutput) {
                        log.info("tar output: " + capturedOutput);
                        if (exitCode != 0) {
                            log.info("download_archive_and_script ERROR: " + exitCode);
                            log.info("download_archive_and_script output: " + capturedOutput);
                            show_buttons();
                        }
                        else {
                            get_device_info(command, true);
                        }
                    }
                });
            }
            else {
                log.info("download_archive_and_script ERROR: " + exitCode + "output: " + capturedOutput);
                if (command == "check") {
                    get_device_info(command, false);
                }
                show_Status("Network error");
                show_buttons();
                // error: network error!
            }
        }
    });
}

function get_device_info(command, connection) {
    // if we want to check installed and latest but there is no connection 
    // we need to check for nvt directory on wb, and if there is one, 
    // at least show the current version
    if (command == "check" && connection == false) { check_for_nvt_directory(); }
    // if we're checking or installing(not manually installing, so the device has any firmware or we dont know yet),
    // we get device info, check current and latest available versions
    else if (getControl("Nevoton-Boiler-Gate/Device_info").getValue() == "...") {
        runShellCommand("bash /home/nevoton_gate/script.sh " + getControl("Nevoton-Boiler-Gate/Slot").getValue(), {
            captureOutput: true,
            exitCallback: function (exitCode, capturedOutput) {
                if (String(exitCode) == "0") {
                    parsedJson = JSON.parse(capturedOutput);
                    log.info("get_device_info Output: " + parsedJson["version"] + " " + parsedJson["name"]);
                    if (parsedJson["name"] != "OpenTherm-Modbus-WB" && parsedJson["name"] != "eBus-Modbus-WB") {
                        error_device_unknown();
                    }
                    else {
                        if (command == "check") { getControl("Nevoton-Boiler-Gate/VersionFirmwareCurrent").setValue(String(parsedJson["version"])); }
                        // // вот этот позор на одну строку заменить следовало бы на одну
                        // if (parsedJson["name"] == "Opentherm-Modbus-WB") {
                        //     new_value = "OpenTherm-Modbus-WB";
                        // }
                        // else {
                        //     new_value = parsedJson["name"];
                        // }
                        getControl("Nevoton-Boiler-Gate/Device_info").setValue((parsedJson["name"]));
                        if (connection) {
                            get_version_latest(command);
                        }
                        else {
                            getControl("Nevoton-Boiler-Gate/VersionFirmwareLatest").setValue("unknown");
                        }
                    }
                }
                else {
                    log.info("get_device_info ERROR: " + exitCode);
                    log.info("get_device_info output: " + capturedOutput);
                    error_device_unknown();
                    show_buttons();
                }
            }
        });
    }
    // if there is connection and there is no firmware on device, we can manually install it
    // может добавить для случая что нет коннекта но сама папка есть, чтоб можно было шить без коннекта
    else if (connection) {
        if (getControl("Nevoton-Boiler-Gate/Device_info").getValue() == "OpenTherm-Modbus-WB" || getControl("Nevoton-Boiler-Gate/Device_info").getValue() == "eBus-Modbus-WB") {
            get_version_latest(command);
            getControl("Nevoton-Boiler-Gate/VersionFirmwareCurrent").setValue("unknown");
        }
        else {
            error_device_unknown();
            show_Status("1 for OpenTherm-Modbus-WB or 2 for eBus-Modbus-WB in Device or ... to try again");
            getControl("Nevoton-Boiler-Gate/Status").setTitle("");
            show_buttons();
        }
    }
}

function check_for_nvt_directory() {
    runShellCommand("test -d /home/nevoton_gate/nvt && echo 'exists' || echo 'does not exist' ", {
        captureOutput: true,
        exitCallback: function (exitCode, capturedOutput) {
            if (exitCode == 0) {
                log.info("check_for_nvt_directory exitcode: " + exitCode + ", output: " + capturedOutput);
                if (capturedOutput == "exists") {
                    get_device_info("dummy", false);
                }
            }
            else {
                log.info("check_for_nvt_directory exitcode: " + exitCode + ", output: " + capturedOutput);
            }
        }
    });
}

function get_version_latest(command) {
    // ещё неясно в одном архиве все файлы будут лежать или нет так что пока оставим так но здесь может появиться условие типа if()
    runShellCommand("wget -O /home/nevoton_gate/version.json --no-check-certificate -P /home/ot_modbus/wb 'https://gitlab.nevoton.ru/kuliev/FirmwareWIRENBOARD/-/raw/master/version.json?ref_type=heads&inline=false'", {
        captureOutput: true,
        exitCallback: function (exitCode, capturedOutput) {
            log.info("get_version_latest exitCode: " + String(exitCode));
            if (String(exitCode) == "0") {
                show_version_latest(command);
            }
            else {
                log.info("download version files ERROR: " + exitCode + "output: " + capturedOutput);
                show_Status("Network error");
                show_buttons();
            }
        }
    });
}

function show_version_latest(command) {
    runShellCommand("cat /home/nevoton_gate/version.json", {
        captureOutput: true,
        exitCallback: function (exitCode, capturedOutput) {
            if (String(exitCode) == "0") {
                parsedJsonVersions = JSON.parse(capturedOutput);
                new_version = parsedJsonVersions[getControl("Nevoton-Boiler-Gate/Device_info").getValue()];
                // log.info("show_version_latest new_version : " + String(new_version));
                getControl("Nevoton-Boiler-Gate/VersionFirmwareLatest").setValue(String(new_version));
                // log.info(getControl("Nevoton-Boiler-Gate/VersionFirmwareLatest").getValue());
                if (command == "update") {
                    burn_device();
                }
                else {
                    hide_Status();
                    show_buttons();
                }
            }
            else {
                log.info("show_version_latest ERROR: " + exitCode + ", command: " + command);
                log.info("show_version_latest output: " + capturedOutput);
                show_buttons();
            }
        }
    });
}

function burn_device() {
    file_name = "opentherm_modbus_wb.enc";
    if (getControl("Nevoton-Boiler-Gate/Device_info").getValue() == "eBus-Modbus-WB") {
        file_name = "ebus_modbus_wb.enc";
    }
    runShellCommand("bash /home/nevoton_gate/script.sh " + getControl("Nevoton-Boiler-Gate/Slot").getValue() + " " + file_name, {
        captureOutput: true,
        exitCallback: function (exitCode, capturedOutput) {
            if (String(exitCode) == "0") {
                log.info("burn_device exitCode: " + exitCode);
                parsedJson = JSON.parse(capturedOutput);
                getControl("Nevoton-Boiler-Gate/VersionFirmwareCurrent").setValue(String(parsedJson["version"]));
                hide_Status();
                show_buttons();
            }
            else {
                show_Status("error burning device!" + capturedOutput);
                log.info("burn_device ERROR: " + exitCode + "  " + capturedOutput);
                show_buttons();
            }
        }
    });
}

defineRule("UpdateNevoton-Boiler-Gate", {
    whenChanged: "Nevoton-Boiler-Gate/Update",
    then: function () {
        hide_buttons();
        getControl("Nevoton-Boiler-Gate/VersionFirmwareCurrent").setValue("...");
        getControl("Nevoton-Boiler-Gate/VersionFirmwareLatest").setValue("...");
        if (getControl("Nevoton-Boiler-Gate/Device_info").getReadonly()) {
            getControl("Nevoton-Boiler-Gate/Device_info").setValue("...");
        }
        else {
            if (getControl("Nevoton-Boiler-Gate/Device_info").getValue() == "1") {
                getControl("Nevoton-Boiler-Gate/Device_info").setValue("OpenTherm-Modbus-WB");
            }
            else if (getControl("Nevoton-Boiler-Gate/Device_info").getValue() == "2") {
                getControl("Nevoton-Boiler-Gate/Device_info").setValue("eBus-Modbus-WB");
            }
            // else if(getControl("Nevoton-Boiler-Gate/Device_info").getValue() == "unknown"){
            //     getControl("Nevoton-Boiler-Gate/Device_info").setValue("...");
            // }
            getControl("Nevoton-Boiler-Gate/Device_info").setReadonly(true)
        }
        show_Status("Wait...");
        download_archive_and_script("update");
    }
});

defineRule("CheckFirmwareVersion", {
    whenChanged: "Nevoton-Boiler-Gate/CheckFirmwareVersion",
    then: function () {
        hide_buttons();
        getControl("Nevoton-Boiler-Gate/VersionFirmwareCurrent").setValue("...");
        getControl("Nevoton-Boiler-Gate/VersionFirmwareLatest").setValue("...");
        if (getControl("Nevoton-Boiler-Gate/Device_info").getReadonly()) {
            getControl("Nevoton-Boiler-Gate/Device_info").setValue("...");
        }
        else {
            if (getControl("Nevoton-Boiler-Gate/Device_info").getValue() == "1") {
                getControl("Nevoton-Boiler-Gate/Device_info").setValue("OpenTherm-Modbus-WB");
            }
            else if (getControl("Nevoton-Boiler-Gate/Device_info").getValue() == "2") {
                getControl("Nevoton-Boiler-Gate/Device_info").setValue("eBus-Modbus-WB");
            }
            // else if(getControl("Nevoton-Boiler-Gate/Device_info").getValue() == "unknown"){
            //     getControl("Nevoton-Boiler-Gate/Device_info").setValue("...");
            // }
            getControl("Nevoton-Boiler-Gate/Device_info").setReadonly(true)
        }
        show_Status("Wait...");
        download_archive_and_script("check");
    }
});

defineRule("Reset", {
    whenChanged: "Nevoton-Boiler-Gate/Slot",
    then: function () {
        getControl("Nevoton-Boiler-Gate/Device_info").setReadonly(true);
        getControl("Nevoton-Boiler-Gate/Device_info").setValue("undefined");
        hide_Status();
        getControl("Nevoton-Boiler-Gate/VersionFirmwareLatest").setValue("undefined");
        getControl("Nevoton-Boiler-Gate/VersionFirmwareCurrent").setValue("undefined");
    }
});
