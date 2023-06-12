// Demo for https://github.com/wirenboard/wb-community/tree/main/wb-press-actions

var pa = require('wb-press-actions');

var commands = [
  {
    btnControl: 'wb-mcm8_20/Input 1 Single Press Counter',
    actionControl: 'wb-mdm3_58/K1',
    actionType: 'on',
  },
  {
    btnControl: 'wb-mcm8_20/Input 1 Double Press Counter',
    actionControl: 'wb-mdm3_58/K1',
    actionType: 'off',
  },
  {
    btnControl: 'wb-mcm8_20/Input 1 Long Press Counter',
    stateControl: 'wb-mcm8_20/Input 1',
    actionControl: 'wb-mdm3_58/Channel 1',
    actionType: 'inc',
  },
  {
    btnControl: 'wb-mcm8_20/Input 1 Shortlong Press Counter',
    stateControl: 'wb-mcm8_20/Input 1',
    actionControl: 'wb-mdm3_58/Channel 1',
    actionType: 'dec',
  },
];

pa.setIncInterval(80); //default 75 ms
pa.setDecInterval(80); //default 75 ms

pa.init(commands);
