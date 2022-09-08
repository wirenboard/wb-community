//Виртуальное устройство для управления воротами c помощью модуля реле WB-MR6C v.3
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
 DoorOpen: {            //Виртуальная кнопка Открыть калитку
    type : "pushbutton",
    value : false,
    order: 4
 },  
 isOpen: {              //Датчик положения ворот "Открыто"
    type : "switch",
    value : false,
    readonly: true,
    order: 5
 },
 isClosed: {            //Датчик положения ворот "Закрыто"
    type : "switch",
    value : false,
    readonly: true,
    order: 6
 },
  Call: {              //Звонок на калитке
    type : "switch",
    value : false,
    readonly: true,
    order: 7
 },
 Foto: {              //Фотоэлемент
    type : "switch",
    value : false,
    readonly: true,
    order: 8
 }, 
  Alarm: {              //Авария
    type : "alarm",
    value : false,
    readonly: true,
    order: 9
 },  
};

defineVirtualDevice("GateControlling", {
    title:"Gate",
    cells: deviceCells
});

//Открытие ворот
defineRule("GateStartOpen", {                
  whenChanged: ["GateControlling/GateOpen", "wb-mr6cv3_135/Input 5 counter"],
  then: function () {
  if(dev["wb-mr6cv3_135/Input 0"] == false && dev["GateControlling/Foto"] == false) { 
    	dev["wb-mr6cv3_135/K1"] = true;
        dev["wb-mr6cv3_135/K2"] = false;
    }   
  }
});

//Закрытие ворот
defineRule("GateStartClose", {               
  whenChanged: ["GateControlling/GateClose", "wb-mr6cv3_135/Input 4 counter"],
  then: function () {   
     if(dev["wb-mr6cv3_135/Input 1"] == false && dev["GateControlling/Foto"] == false) { 
    	dev["wb-mr6cv3_135/K2"] = true;
        dev["wb-mr6cv3_135/K1"] = false;
    }     
  }
});

//Остановка ворот
defineRule("GateStartStop", {   
  whenChanged: ["GateControlling/GateStop", "wb-mr6cv3_135/Input 2 counter", "wb-mr6cv3_135/Input 6 counter"],
  then: function () {   
  dev["wb-mr6cv3_135/K1"] = false;
  dev["wb-mr6cv3_135/K2"] = false;   
  }
});

//Открыть калитку
defineRule("DoorOpen", {   
  whenChanged: "GateControlling/DoorOpen",
  then: function () {   
  dev["wb-mr6cv3_135/K3"] = true;
  setTimeout(function () {
       dev["wb-mr6cv3_135/K3"] = false;
    }, 1000)   
  }
});

//Отслеживание положения ворот 
defineRule("Position", {   
  whenChanged: ["wb-mr6cv3_135/Input 0", "wb-mr6cv3_135/Input 1", "wb-mr6cv3_135/Input 2", "wb-mr6cv3_135/Input 3"],
  then: function () {   
 dev["GateControlling/isOpen"] = dev["wb-mr6cv3_135/Input 0"];  //Датчик Открыто
 dev["GateControlling/isClosed"] = dev["wb-mr6cv3_135/Input 1"];   //Датчик Закрыто
 dev["GateControlling/Foto"] = dev["wb-mr6cv3_135/Input 2"];   //Фотоэлемет
 dev["GateControlling/Call"] = dev["wb-mr6cv3_135/Input 3"];   //Звонок
    
 if(dev["wb-mr6cv3_135/Input 0"] == true) dev["wb-mr6cv3_135/K1"] = false; 
 if(dev["wb-mr6cv3_135/Input 1"] == true) dev["wb-mr6cv3_135/K2"] = false;
  
 if(dev["wb-mr6cv3_135/Input 2"] == true) { 
    dev["wb-mr6cv3_135/K1"] = false;
    dev["wb-mr6cv3_135/K2"] = false;
       } 
    
    dev["GateControlling/Alarm"] = dev["wb-mr6cv3_135/Input 2"];
  }
});
