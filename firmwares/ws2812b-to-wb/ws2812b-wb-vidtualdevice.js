defineVirtualDevice("ws2812b", {
    title: "ws2812b",
    cells: {
      enabled: {
        title: "состояние",
        type: "switch",
        value: false,
      },
      brightness: {
        title: "яркость",
        type: "range",
        min: 0,
        max: 255,
        value: 50,
      },      
	  hueLoop: {
        title: "смена оттенков",
        type: "switch",
        value: true,	  
	  },
      delayMs: {
        title: "задержка обновления, мс",
        type: "range",
        min: 0,
        max: 1000,
        value: 10,
      }
	}
})

defineRule("ws2812b/enabled", {
  whenChanged: "ws2812b/enabled",
  then: function (newValue, devName, cellName) {
    if(newValue) {
      dev["ws2812b"]["brightness"] = 50
    } else {
      dev["ws2812b"]["brightness"] = 0
    }
  }
})
