
//Виртуальное устройство для управления воротами
var deviceCells = { 
GateOpen: {             //Виртуальная кнопка Открыть
    type : "pushbutton",
    value : false,
    order: 1
 },
 GateClose: {           //Виртуальная кнопка Закрыть
    type : "pushbutton",
    value : false,
    order: 2
  },
 GateStop: {            //Виртуальная кнопка Стоп
    type : "pushbutton",
    value : false,
    order: 3
 }, 
 isOpen: {              //Датчик положения ворот "Открыто"
    type : "switch",
    value : false,
    readonly: true,
    order: 4
 },
 isClosed: {            //Датчик положения ворот "Закрыто"
    type : "switch",
    value : false,
    readonly: true,
    order: 5
 },
};

defineVirtualDevice("GateControlling", {
    title:"Gate",
    cells: deviceCells
});

//Открытие ворот
defineRule("GateStartOpen", {                
  whenChanged: "GateControlling/GateOpen",
  then: function () {
  if(dev ["wb-mrm2-mini_12/Input 1"] == false) { 
    	dev["wb-mrm2-mini_12/K1"] = true;
        dev["wb-mrm2-mini_125/K2"] = false;
    }   
  }
});

//Закрытие ворот
defineRule("GateStartClose", {               
  whenChanged: "GateControlling/GateClose",
  then: function () {   
     if(dev["wb-mrm2-mini_12/Input 2"] == false) { 
    	dev["wb-mrm2-mini_12/K2"] = true;
        dev["wb-mrm2-mini_12/K1"] = false;
    }     
  }
});

//Остановка ворот
defineRule("GateStartStop", {   
  whenChanged: "GateControlling/GateStop",
  then: function () {   
  dev["wb-mrm2-mini_12/K1"] = false;
  dev["wb-mrm2-mini_12/K2"] = false;   
  }
});

//Отслеживание положения ворот 
defineRule("Position", {   
  whenChanged: ["wb-mrm2-mini_12/Input 1", "wb-mrm2-mini_12/Input 2"],
  then: function () {   
 dev["GateControlling/isOpen"] = dev["wb-mrm2-mini_12/Input 1"];
 dev["GateControlling/isClosed"] = dev["wb-mrm2-mini_12/Input 2"];    
 if(dev["wb-mrm2-mini_12/Input 1"] == true) dev["wb-mrm2-mini_12/K1"] = false; 
 if(dev["wb-mrm2-mini_12/Input 2"] == true) dev["wb-mrm2-mini_12/K2"] = false;
  }
});
