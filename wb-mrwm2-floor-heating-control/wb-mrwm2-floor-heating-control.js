 //Temperature sensors: "xxxxxxxx" - replace with the address of the temperature sensor, specify the correct id of the relay module  
var TempSensor1 = "wb-w1/xxxxxxxx";   //First temperature sensor 
var TempSensor2 = "wb-w2/xxxxxxxx";   //Second temperature sensor
  
//Chanels of relay module for heating controlling
var FirstCircuitControl = "wb-mrwm2_ID/K1"; //where ID is modbus adress of WB-MRWM2 module
var SecondCircuitControl = "wb-mrwm2_ID/K2";
      
//Power meter MQTT-topics of WB-MRWM2 module
var FirstPowerMeter = "wb-mrwm2_ID/P L1";  //where ID is modbus adress of WB-MRWM2 module
var SecondPowerMeter = "wb-mrwm2_ID/P L2";  
  
  
//Settings
var Tmax = 40;   //Upper temperature limit of the heating element, 
var Tmin = 45;    //Lower limit of heating element temperature
var Pmax1 = 1000;   //Maximum permissible power of the primary circuit
var Pmax2 = 1000;     //Maximum permissible power of the second circuit
      

//Virtual device for floor heating control
var Floor = { 
    OnOff1: {             //Button for switching on the primary circuit
        type : "switch",
        title: "Turn on first circuit",
        value: false,
        readonly: false,
        order: 1,
       },
    OnOff2: {             //Button for turning on the second circuit
        type : "switch",
        title: "Turn on second circuit",
        value : false,
        readonly: false,
        order: 2
      },  
    IsOn1: {              //Primary circuit in heating mode
        type : "switch",
        title: "First circuit status",
        value : false,
        readonly: true,
        order: 3
      },
    IsOn2: {              //Second circuit in heating mode
        type : "switch",
        title: "Second circuit status",
        value : false,
        readonly: true,
        order: 4
      },
    Temp1: {              //Primary heating element temperature
        type : "temperature",
        title: "First circuit temperature",
        value: 0,
        order: 5
      },
    Temp2: {              //Second heating element temperature
        type : "temperature",
        title: "Second circuit temperature",
        value: 0,
        order: 6
      },
    Alarm1: {              //Malfunction in the primary circuit
        type : "switch",
        title: "First circuit alarm",
        value : false,
        readonly: false,
        order: 7
      },
    Alarm2: {              //Malfunction in the second circuit
        type : "switch",
        title: "Second circuit alarm",
        value : false,
        readonly: false,
        order: 8
      },
    Tmax: {              //Upper heating element temperature set point
        type : "temperature",
        title: "Seting maximum temperature",
        value: Tmax,
        order: 9,
        readonly: false    
      },
    Tmin: {              //Lower heating element temperature set point
        type : "temperature",
        title: "Seting minimum temperature",
        value: Tmin,
        order: 10,
        readonly: false
      },
    Pmax1: {              //Maximum permissible power of the primary circuit 
        type : "power",
        title: "Max power of first circuit",
        value: Pmax1,
        order: 11,
        readonly: true  
      },
    Pmax2: {              //Maximum permissible power of the second circuit
        type : "power",
        title: "Max power of second circuit",
        value: Pmax2,
        order: 12,
        readonly: true  
      },   
    };
    
      defineVirtualDevice("Heating", {
        title:"Floor heating",         
        cells: Floor
      });
  
    //First circuit control
    defineRule("Heating1",  {                
      whenChanged: [TempSensor1, "Heating/OnOff1"],
      then: function () {
        if(dev[TempSensor1] < dev["Heating/Tmin"] && dev["Heating/OnOff1"] == true && dev["Heating/Alarm1"] == false) { 
        dev[FirstCircuitControl] = true;
        dev["Heating/IsOn1"] = true
        };
        if(dev[TempSensor1] > dev["Heating/Tmax"]) { 
        dev[FirstCircuitControl] = false;
        dev["Heating/IsOn1"] = false
        };
        dev["Heating/Temp1"] = dev[TempSensor1];
      }
    });
    
    //Second circuit control
    defineRule("Heating2",  {                
      whenChanged: [TempSensor2, "Heating/OnOff2"],
      then: function () {
        if(dev[TempSensor2] < dev["Heating/Tmin"] && dev["Heating/OnOff2"] == true && dev["Heating/Alarm2"] == false) { 
        dev[SecondCircuitControl] = true;
        dev["Heating/IsOn2"] = true
        };
        if(dev[TempSensor2] > dev["Heating/Tmax"]) { 
        dev[SecondCircuitControl] = false;
        dev["Heating/IsOn2"] = false
        };
        dev["Heating/Temp2"] = dev[TempSensor2];
      }
    });
    
    //Fault signaling
    defineRule("Alarm",  {                
      whenChanged: [FirstPowerMeter, SecondPowerMeter, "Heating/OnOff1", "Heating/OnOff2"],
      then: function () {
        if(dev[FirstPowerMeter] > Pmax1) {       //If the power consumption exceeds the limit, the heating element current is faulty
          dev["Heating/Alarm1"] = true;
          dev[FirstCircuitControl] = false;
          dev["Heating/IsOn1"] = false
        };
        if(dev[SecondPowerMeter] > Pmax2) { 
          dev["Heating/Alarm2"] = true;
          dev[SecondCircuitControl] = false;
          dev["Heating/IsOn2"] = false
        };


        if(dev["Heating/OnOff1"] == true && dev[FirstPowerMeter] < 1) {   //If after switching on, the power consumption has not increased, then a break in the line
        dev["Heating/Alarm1"] = true;
        dev[FirstCircuitControl] = false;
        dev["Heating/IsOn1"] = false
        };
        if(dev["Heating/OnOff2"] == true && dev[SecondPowerMeter] < 1) { 
        dev["Heating/Alarm2"] = true;
        dev[SecondCircuitControl] = false;
        dev["Heating/IsOn2"] = false
        };
      }
    });
    
