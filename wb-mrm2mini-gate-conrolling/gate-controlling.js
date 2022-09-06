
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
  if(dev ["wb-mr6c_135/Input 0"] == false) { 
    	dev["wb-mr6c_135/K1"] = true;
        dev["wb-mr6c_135/K2"] = false;
    }   
  }
});

//Закрытие ворот
defineRule("GateStartClose", {               
  whenChanged: "GateControlling/GateClose",
  then: function () {   
     if(dev["wb-mr6c_135/Input 1"] == false) { 
    	dev["wb-mr6c_135/K2"] = true;
        dev["wb-mr6c_135/K1"] = false;
    }     
  }
});

//Остановка ворот
defineRule("GateStartStop", {   
  whenChanged: "GateControlling/GateStop",
  then: function () {   
  dev["wb-mr6c_135/K1"] = false;
  dev["wb-mr6c_135/K2"] = false;   
  }
});

//Отслеживание положения ворот 
defineRule("Position", {   
  whenChanged: ["wb-mr6c_135/Input 0", "wb-mr6c_135/Input 1"],
  then: function () {   
 dev["GateControlling/isOpen"] = dev["wb-mr6c_135/Input 0"];
 dev["GateControlling/isClosed"] = dev["wb-mr6c_135/Input 1"];    
 if(dev["wb-mr6c_135/Input 0"] == true) { 
    	dev["wb-mr6c_135/K1"] = false;
    }
  if(dev["wb-mr6c_135/Input 1"] == true) { 
    	dev["wb-mr6c_135/K2"] = false;
    }   
  }
});
