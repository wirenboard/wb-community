Example of a module for working with Sonoff NSPanel (NXPanel).

Copy the file to install `module/nxpanel2wb.js` on controller to folder `/etc/wb-rules-modules/` and restart wb-rules `systemctl restart wb-rules`.

After that, connect the module to the wb-rules script:
```
var panel = require("nxpanel2wb");
panel.init("ns-panel", "tasmota_C846D4") // deviceName, tasmotaName
...
Your Code

```
See example in file `demo/nxpanel2wb-demo`,
Additional information: https://wirenboard.com/wiki/Sonoff_NSPanel