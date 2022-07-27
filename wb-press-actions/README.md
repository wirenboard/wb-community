The wb-rules module for assigning actions to click counters.

Copy the file to install `module/wb-press-actions.js` on controller to folder `/etc/wb-rules-modules/` and restart wb-rules `systemctl restart wb-rules`.

After that, connect the module to the wb-rules script, fill in the commands array and pass it to the module with the `init` command:
```
var pa = require("wb-press-actions"); 

var commands = [
    { btnControl: "wb-mcm8_20/Input 1 Single Press Counter", actionControl: "wb-mdm3_58/K1", actionType: "toggle" },    
    { btnControl: "wb-mcm8_20/Input 1 Long Press Counter", stateControl: "wb-mcm8_20/Input 1", actionControl: "wb-mdm3_58/Channel 1", actionType: "inc" },
    { btnControl: "wb-mcm8_20/Input 1 Shortlong Press Counter", stateControl: "wb-mcm8_20/Input 1", actionControl: "wb-mdm3_58/Channel 1", actionType: "dec" },
  ];

pa.init(commands);
```
Commands array parameters:
- btnControl — button topic. Usually use Input press counters.
- stateControl — button state topic, for inc/dec only. It is necessary to determine the moment when you released the button.
- actionControl — the topic that we will change
- actionType — action type: on | off | toggle | inc | dec

See example in file `demo/wb-mcm8-press-actions.js`.