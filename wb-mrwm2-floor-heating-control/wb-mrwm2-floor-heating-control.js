// place your rules here or add more .js files in this directory
log("add your rules to /etc/wb-rules/");

//Virtual device for floor heating control
var Floor = { 
OnOff1: {             //Button for switching on the primary circuit
    type : "switch",
    value : false,
    readonly: false,
    order: 1
  },
OnOff2: {             //Button for turning on the second circuit
    type : "switch",
    value : false,
    readonly: false,
    order: 2
  },  
IsOn2: {              //Primary circuit in heating mode
    type : "switch",
    value : false,
    readonly: true,
    order: 3
  },
IsOn2: {              //Second circuit in heating mode
    type : "switch",
    value : false,
    readonly: true,
    order: 4
  },
Temp1: {              //Primary heating element temperature
    type : "value",
    value : 0,
    order: 5
  },
Temp2: {              //Second heating element temperature
    type : "value",
    value : 0,
    order: 6
  },
Alarm1: {              //Malfunction in the primary circuit
    type : "switch",
    value : false,
    readonly: false,
    order: 7
  },
Alarm2: {              //Malfunction in the second circuit
    type : "switch",
    value : false,
    readonly: false,
    order: 8
  },
Tmax: {              //Upper heating element temperature set point
    type : "value",
    value : 0,
    order: 9,
    readonly: false    
  },
Tmin: {              //Lower heating element temperature set point
    type : "value",
    value : 0,
    order: 10,
    readonly: false
  },
Pmax1: {              //Maximum permissible power of the primary circuit 
    type : "value",
    value : 0,
    order: 11,
    readonly: false  
  },
Pmax2: {              //Maximum permissible power of the second circuit
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
var Tmax = 45;   //Upper temperature limit of the heating element
var Tmin = 35;     //Lower limit of heating element temperature
var Pmax1 = 1000;   //Maximum permissible power of the primary circuit
var Pmax2 = 1000;     //Maximum permissible power of the second circuit
 
//Primary circuit control, "xxxxxxxx" - replace with the address of the temperature sensor, specify the correct id of the relay module
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

//Second circuit control, "xxxxxxxx" - replace with the address of the temperature sensor, specify the correct id of the relay module
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

//Fault signaling. Specify the correct id of the relay module
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
