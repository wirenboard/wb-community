The wb-rules module for assigning actions to press counters.

Copy the file to install `module/wb-press-actions.js` on controller to folder `/etc/wb-rules-modules/` and restart wb-rules `systemctl restart wb-rules`.

After that, connect the module to the wb-rules script, fill in the commands array and pass it to the module with the `init` command:
```
var pa = require("wb-press-actions"); 

var commands = [
    { btnControl: "wb-mcm8_20/Input 1 Single Press Counter", actionControl: "wb-mdm3_58/K1", actionType: "toggle" },    
    { btnControl: "wb-mcm8_20/Input 1 Long Press Counter", stateControl: "wb-mcm8_20/Input 1", actionControl: "wb-mdm3_58/Channel 1", actionType: "inc", maxValue: 90 },
    { btnControl: "wb-mcm8_20/Input 1 Shortlong Press Counter", stateControl: "wb-mcm8_20/Input 1", actionControl: "wb-mdm3_58/Channel 1", actionType: "dec" },
  ];

pa.init(commands);
```
Commands array parameters:
- `btnControl` — button topic. Usually use Input press counters.
- `stateControl` — button state topic, for inc/dec only. It is necessary to determine the moment when you released the button.
- `actionControl` — the topic that we will change
- `actionType` — action type: on | off | toggle | inc | dec
- `maxValue` — the maximum value as the value increases. Default 100. Must not exceed the actual maximum of the target control (e.g. 100 for wb-mdm3 channels).
- `minValue` — the minimum value when decreasing the value. Default 0.

Other Options:
- `setIncInterval(value_in_ms)` — interval of increasing the value by one unit. Default 75 ms.
- `setDecInterval(value_in_ms)` — interval of decreasing the value by one unit. Default 75 ms.

Notes:
- A `btnControl` change to 0 is treated as a counter reset (press counters reset when the device is power-cycled or reflashed) and is ignored, so power blinks on the bus do not trigger actions. Side effect: when a counter wraps around 65535 → 0, that one press is lost.
- Invalid or duplicate commands are skipped with an error in the wb-rules log; the remaining commands keep working.

See example in file `demo/wb-mcm8-press-actions.js`.
