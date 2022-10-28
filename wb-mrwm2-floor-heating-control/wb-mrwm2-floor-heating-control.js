// place your rules here or add more .js files in this directory
log("add your rules to /etc/wb-rules/");

//Виртуальное устройство для управления теплым полом
var Floor = { 
OnOff1: {             //Кнопка включения первого контура
    type : "switch",
    value : false,
    readonly: false,
    order: 1
  },
OnOff2: {             //Кнопка включения второго контура
    type : "switch",
    value : false,
    readonly: false,
    order: 2
  },  
IsOn2: {              //Первый контур в режиме нагрева
    type : "switch",
    value : false,
    readonly: true,
    order: 3
  },
IsOn2: {              //Второй контур в режиме нагрева
    type : "switch",
    value : false,
    readonly: true,
    order: 4
  },
Temp1: {              //Температура нагревательного элемента первого контура
    type : "value",
    value : 0,
    order: 5
  },
Temp2: {              //Температура нагревательного элемента второго контура
    type : "value",
    value : 0,
    order: 6
  },
Alarm1: {              //Неисправность в первом контуре 
    type : "switch",
    value : false,
    readonly: false,
    order: 7
  },
Alarm2: {              //Неисправность во втором контуре 
    type : "switch",
    value : false,
    readonly: false,
    order: 8
  },
Tmax: {              //Верхняя уставка температуры нагревательного элемента
    type : "value",
    value : 0,
    order: 9,
    readonly: false    
  },
Tmin: {              //Нижняя уставка температуры нагревательного элемента
    type : "value",
    value : 0,
    order: 10,
    readonly: false
  },
Pmax1: {              //Предельно допустимая мощность первого контура 
    type : "value",
    value : 0,
    order: 11,
    readonly: false  
  },
Pmax2: {              //Предельно допустимая мощность второго контура
    type : "value",
    value : 0,
    order: 12,
    readonly: false  
  },   
};

  defineVirtualDevice("Heating", {
    title:"Теплый пол",
    cells: Floor
  });

//Уставки температуры
var Tmax = 45;   //Верхняя граница температуры нагревательного элемента
var Tmin = 35;     //Нижняя граница температуры нагревательного элемента
var Pmax1 = 1000;   //Предельно допустимая мощность первого контура
var Pmax2 = 1000;     //Предельно допустимая мощность второго контура
 
//Управление первым контуром, "xxxxxxxx" - заменить на адрес датчика температуры, указать корректный id модуля реле
defineRule("Heating1",  {                
  whenChanged: ["wb-w1/xxxxxxxx", "Floor/OnOff1"],
  then: function () {
    if(dev["wb-w1/xxxxxxxx"] < dev["Floor/Tmin"] && dev["Floor/OnOff1"] = true) { 
    dev["wb-mrwm2_21/K1"] = true
    };
    if(dev["wb-w1/xxxxxxxx"] > dev["Floor/Tmax"]) { 
    dev["wb-mrwm2_21/K1"] = false
    };
    dev["Floor/Temp1"] = dev["wb-w1/xxxxxxxx"];
  }
 
});

//Управление вторым контуром, "xxxxxxxx" - заменить на адрес датчика температуры, указать корректный id модуля реле
defineRule("Heating2",  {                
  whenChanged: ["wb-w2/xxxxxxxx", "Floor/OnOff2"],
  then: function () {
    if(dev["wb-w2/xxxxxxxx"] < dev["Floor/Tmin"] && dev["Floor/OnOff2"] = true) { 
    dev["wb-mrwm2_21/K2"] = true
    };
    if(dev["wb-w2/xxxxxxxx"] > dev["Floor/Tmax"]) { 
    dev["wb-mrwm2_21/K2"] = false
    };
    dev["Floor/Temp2"] = dev["wb-w2/xxxxxxxx"];
  }
});

//Сигнализация о неисправности. Указать корректный id модуля реле
defineRule("Alarm",  {                
  whenChanged: ["wb-mrwm2_21/P L1", "wb-mrwm2_21/P L2", "Floor/OnOff1", "Floor/OnOff2"],
  then: function () {
    if(dev["wb-mrwm2_21/P L1"] > dev["Floor/Pmax1"]) {       //Если потребляемая мощность выше допустимой, то нагревательный элемент неисправен
      dev["Floor/Alarm1"] = true;
      dev["wb-mr6cv3_135/K1"] = false
    };
    if(dev["wb-mrwm2_21/P L2"] > dev["Floor/Pmax2"]) { 
      dev["Floor/Alarm2"] = true;
      dev["wb-mr6cv3_135/K2"] = false
    };
    if(dev["Floor/OnOff1"] = true && dev["wb-mrwm2_21/P L1"] < 1) {   //Если после включения потребляемая мощность не увеличилась, то обрыв на линии
    dev["Floor/Alarm1"] = true
    };
    if(dev["Floor/OnOff2"] = true && dev["wb-mrwm2_21/P L2"] < 1) { 
    dev["Floor/Alarm2"] = true
    };
  }
});
