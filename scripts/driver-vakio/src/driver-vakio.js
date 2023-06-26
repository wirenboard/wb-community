// Автор: Clevelus
createVakioBaseSmart({
  id: 1, //Указываем уникальный идентификатор виртуального устройства
  topic: "VAKIO", //Указываем MQTT топик, который был указан при настройке подключения к MQTT серверу
  polling_interval: 3, //Указываем период опроса наличия соединения с рекуператором в секундах
  hidden_update: true, //Указываем, будет ли скрыта кнопка обновления устройства: true = скрыта / false = актива
  hidden_reset: true, //Указываем, будет ли скрыта кнопка сброса до заводских настроек: true = скрыта / false = актива
})


function createVakioBaseSmart(params){ //Создаем функцию
  var id = params.id //В переменную id передаем значение параметра id
    var topic = params.topic //В переменную topic передаем значение параметра topic
    var polling_interval = params.polling_interval == undefined ? 3 : params.polling_interval //Если параметр polling_interval объявлен, то передаем его в переменную polling_interval, в ином случае в переменную передаем "3"
    var hidden_update = params.hidden_update == undefined ? false : params.hidden_update //Если параметр hidden_update объявлен, то передаем его в переменную hidden_update, в ином случае в переменную передаем "false"
    var hidden_reset = params.hidden_reset == undefined ? false : params.hidden_reset //Если параметр hidden_reset объявлен, то передаем его в переменную hidden_reset, в ином случае в переменную передаем "false"

    var nameVirtualDevice = "Vakio_{}".format(id) //Формируем наш DevName (device name)

    var mqttTopicState = "State"
    var mqttTopicWorkmode =  "Workmode"
    var mqttTopicSpeed = "Speed"
    var mqttTopicSeries = "Series"
    var mqttTopicSubType = "SubType"
    var mqttTopicXtalFreq = "xtalFreq"
    var mqttTopicMAC = "MAC"
    var mqttTopicFWversion = "FW version"
    var mqttTopicConnect = "Connect"
    var mqttTopicReset = "Reset"
    var mqttTopicUpdate = "Update FW"

    defineVirtualDevice(nameVirtualDevice, {
      title: "Vakio Base Smart {}".format(topic),
      cells: {}
    });


    getDevice(nameVirtualDevice).addControl(mqttTopicState, { type: "switch", order: 0, value: false});
    getDevice(nameVirtualDevice).addControl(mqttTopicWorkmode, { type: "range", order: 1, min: 0, max: 6, value: 0});
    getDevice(nameVirtualDevice).addControl(mqttTopicSpeed, { type: "range", order: 2, min: 1, max: 7, value: 0});
    getDevice(nameVirtualDevice).addControl(mqttTopicSeries, { type: "text", order: 3, readonly: true, value: "Loading"});
    getDevice(nameVirtualDevice).addControl(mqttTopicSubType, { type: "text", order: 4, readonly: true, value: "Loading"});
    getDevice(nameVirtualDevice).addControl(mqttTopicXtalFreq, { type: "text", order: 5, readonly: true, value: "Loading"});
    getDevice(nameVirtualDevice).addControl(mqttTopicMAC, { type: "text", order: 6, readonly: true, value: "Loading"});
    getDevice(nameVirtualDevice).addControl(mqttTopicFWversion, { type: "text", order: 7, readonly: true, value: "Loading"});
    getDevice(nameVirtualDevice).addControl(mqttTopicConnect, { type: "switch", order: 10, readonly: true, value: false});


    function sendTranslate(controlTopic, meta){
      publish("/devices/{}/controls/{}/meta".format(nameVirtualDevice, controlTopic), meta, 2, true);
    }

    sendTranslate(mqttTopicState, '{"type": "switch","order":"0","readonly":0,"title":{"ru": "Состояние"}}')
    sendTranslate(mqttTopicWorkmode, '{"type": "range","order":"1","max":"6","readonly":0,"title":{"ru": "Режим работы"}}')
    sendTranslate(mqttTopicSpeed, '{"type": "range","order":"2","max":"7","readonly":0,"title":{"ru": "Скорость"}}')
    sendTranslate(mqttTopicSeries, '{"type": "text","order":"3","readonly": "1","title":{"ru": "Серия"}}')
    sendTranslate(mqttTopicSubType, '{"type": "text","order":"4","readonly": "1","title":{"ru": "Тип вентилятора"}}')
    sendTranslate(mqttTopicXtalFreq, '{"type": "text","order":"5","readonly": "1","title":{"ru": "Частота кварцевого генератора"}}')
    sendTranslate(mqttTopicMAC, '{"type": "text","order":"6","readonly": "1","title":{"ru": "MAC адрес"}}')
    sendTranslate(mqttTopicFWversion, '{"type": "text","order":"7","readonly": "1","title":{"ru": "Версия ПО"}}')
    sendTranslate(mqttTopicConnect, '{"type": "switch","order":"10","readonly": "1","title":{"ru": "Соединение"}}')


    function publishMqtt(subtopic, value){
      publish("{}/{}".format(topic, subtopic), value, 2, true);
    }


    if(!hidden_update){
        getDevice(nameVirtualDevice).addControl(mqttTopicUpdate, { type: "pushbutton", value: false, order: 8 });
        sendTranslate(mqttTopicUpdate, '{"type": "pushbutton","order":"8","readonly": 0,"title":{"ru": "Обновить ПО"}}')
      defineRule("Update FW{}".format(nameVirtualDevice), {
         whenChanged: nameVirtualDevice + "/" + mqttTopicUpdate,
          then: function (newValue, devName, cellName) {
              publishMqtt("system", "0609")
         }
        });
    }
    else{
        if(getDevice(nameVirtualDevice).isControlExists(mqttTopicUpdate)){
          getDevice(nameVirtualDevice).removeControl(mqttTopicUpdate, { type: "pushbutton", value: false, order: 8 });
        }
    }

    if(!hidden_reset){
        getDevice(nameVirtualDevice).addControl(mqttTopicReset, { type: "pushbutton", value: false, order: 9 });
        sendTranslate(mqttTopicReset, '{"type": "pushbutton","order":"9","readonly": 0,"title":{"ru": "Сбросить до заводских"}}')
      defineRule("Reset{}".format(nameVirtualDevice), {
         whenChanged: nameVirtualDevice + "/" + mqttTopicReset,
          then: function (newValue, devName, cellName) {
              publishMqtt("system", "0608")
         }
        });
    }
  else{
        if(getDevice(nameVirtualDevice).isControlExists(mqttTopicReset)){
          getDevice(nameVirtualDevice).removeControl(mqttTopicReset, { type: "pushbutton", value: false, order: 9 });
        }
    }

    trackMqtt("/devices/{}/controls/{}/on".format(nameVirtualDevice, mqttTopicState), function(message){
       var state;
       state = message.value == true ? "on" : "off"
       publishMqtt("state", state)
       if(!dev[mqttTopicSpeed]){
         publish("/devices/{}/controls/{}".format(nameVirtualDevice, mqttTopicSpeed), 1, 2, true);
       }
    });


    trackMqtt("{}/state".format(topic), function(message){
      var stateReal = message.value == "on" ? 1 : 0
      publish("/devices/{}/controls/{}".format(nameVirtualDevice, mqttTopicState), stateReal, 2, true);
    });


    trackMqtt("/devices/{}/controls/{}/on".format(nameVirtualDevice, mqttTopicWorkmode), function(message){
      log.info(message.value)
      switch(parseInt(message.value)){
         case 0:
           publishMqtt("workmode", "inflow")
         break;
         case 1:
           publishMqtt("workmode", "inflow_max")
         break;
         case 2:
           publishMqtt("workmode", "recuperator")
         break;
         case 3:
           publishMqtt("workmode", "winter")
         break;
         case 4:
           publishMqtt("workmode", "outflow")
         break;
         case 5:
           publishMqtt("workmode", "outflow_max")
         break;
         case 6:
           publishMqtt("workmode", "night")
         break;
       }
    });



    trackMqtt("{}/workmode".format(topic), function(message){
      switch(message.value){
        case "inflow":
          publish("/devices/{}/controls/{}".format(nameVirtualDevice, mqttTopicWorkmode), 0, 2, true);
        break;
        case "inflow_max":
          publish("/devices/{}/controls/{}".format(nameVirtualDevice, mqttTopicWorkmode), 1, 2, true);
        break;
        case "recuperator":
          publish("/devices/{}/controls/{}".format(nameVirtualDevice, mqttTopicWorkmode), 2, 2, true);
        break;
        case "winter":
          publish("/devices/{}/controls/{}".format(nameVirtualDevice, mqttTopicWorkmode), 3, 2, true);
        break;
        case "outflow":
          publish("/devices/{}/controls/{}".format(nameVirtualDevice, mqttTopicWorkmode), 4, 2, true);
        break;
        case "outflow_max":
          publish("/devices/{}/controls/{}".format(nameVirtualDevice, mqttTopicWorkmode), 5, 2, true);
        break;
        case "night":
          publish("/devices/{}/controls/{}".format(nameVirtualDevice, mqttTopicWorkmode), 6, 2, true);
        break;
      }

    });

    trackMqtt("/devices/{}/controls/{}/on".format(nameVirtualDevice, mqttTopicSpeed), function(message){
      publishMqtt("speed", message.value)
    });

    trackMqtt("{}/speed".format(topic), function(message){
      publish("/devices/{}/controls/{}".format(nameVirtualDevice, mqttTopicSpeed), parseInt(message.value, 10), 2, true);
    });

    publishMqtt("system", "0687")
   var flagReady = false
    setInterval(function () {
      publishMqtt("system", "0687")
        flagReady = true
    }, 1000 * polling_interval);


    function errorTopic(nameVirtualDevice, nameControl, value){
        value = value == true ? "r" : ""
      publish("/devices/{}/controls/{}/meta/error".format(nameVirtualDevice, nameControl), "{}".format(value), 2, true);
    }

    var oldValue = "default"
    trackMqtt("{}/system".format(topic), function(message){
    if(message.value == "0685"){
          dev[nameVirtualDevice][mqttTopicConnect] = true;

          errorTopic(nameVirtualDevice, mqttTopicState, false)
          errorTopic(nameVirtualDevice, mqttTopicWorkmode, false)
          errorTopic(nameVirtualDevice, mqttTopicSpeed, false)
          errorTopic(nameVirtualDevice, mqttTopicSeries, false)
          errorTopic(nameVirtualDevice, mqttTopicSubType, false)
          errorTopic(nameVirtualDevice, mqttTopicXtalFreq, false)
          errorTopic(nameVirtualDevice, mqttTopicMAC, false)
          errorTopic(nameVirtualDevice, mqttTopicFWversion, false)

      }
        else if((message.value == oldValue)&&(flagReady)){
          dev[nameVirtualDevice][mqttTopicConnect] = false;

          errorTopic(nameVirtualDevice, mqttTopicState, true)
          errorTopic(nameVirtualDevice, mqttTopicWorkmode, true)
          errorTopic(nameVirtualDevice, mqttTopicSpeed, true)
          errorTopic(nameVirtualDevice, mqttTopicSeries, true)
          errorTopic(nameVirtualDevice, mqttTopicSubType, true)
          errorTopic(nameVirtualDevice, mqttTopicXtalFreq, true)
          errorTopic(nameVirtualDevice, mqttTopicMAC, true)
          errorTopic(nameVirtualDevice, mqttTopicFWversion, true)

        }

        if(!(message.value).indexOf('0601')){
           var hardwareInfoObj = JSON.parse(message.value.slice(4, message.value.lenght))
           dev[nameVirtualDevice][mqttTopicSeries] = hardwareInfoObj.series
       dev[nameVirtualDevice][mqttTopicSubType] = hardwareInfoObj.subtype
           dev[nameVirtualDevice][mqttTopicXtalFreq] = hardwareInfoObj.xtal_freq
      }

        if(!(message.value).indexOf('060006')){
           dev[nameVirtualDevice][mqttTopicMAC] = message.value.slice(11, 28)
           dev[nameVirtualDevice][mqttTopicFWversion] = message.value.slice(6, 11)
      }

        oldValue = message.value
    });

}
