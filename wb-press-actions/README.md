The wb-rules module for assigning actions to press counters.

Copy the file to install `module/wb-press-actions.js` on controller to folder `/etc/wb-rules-modules/` and restart wb-rules `systemctl restart wb-rules`.

After that, connect the module to the wb-rules script, fill in the commands array and pass it to the module with the `init` command:
```
var pa = require("wb-press-actions"); 

var commands = [
    { btnControl: "wb-mcm8_20/Input 1 Single Press Counter", actionControl: "wb-mdm3_58/K1", actionType: "toggle" },    
    { btnControl: "wb-mcm8_20/Input 1 Long Press Counter", stateControl: "wb-mcm8_20/Input 1", actionControl: "wb-mdm3_58/Channel 1", actionType: "inc", maxValue: 255 },
    { btnControl: "wb-mcm8_20/Input 1 Shortlong Press Counter", stateControl: "wb-mcm8_20/Input 1", actionControl: "wb-mdm3_58/Channel 1", actionType: "dec" },
  ];

pa.init(commands);
```
Commands array parameters:
- `btnControl` — button topic. Usually use Input press counters.
- `stateControl` — button state topic, for inc/dec only. It is necessary to determine the moment when you released the button.
- `actionControl` — the topic that we will change
- `actionType` — action type: on | off | toggle | inc | dec
- `maxValue` — the maximum value as the value increases. The default is 100.
- `minValue` — the minimum value when decreasing the value. The default is 0.

Other Options:
- `setIncInterval(value_in_ms)` — interval of increasing the value by one unit. Default 75 ms.
- `setDecInterval(value_in_ms)` — interval of decreasing the value by one unit. Default 75 ms.

See example in file `demo/wb-mcm8-press-actions.js`.