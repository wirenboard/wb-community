var metrics = [
  'uptime',
  'clients_connected',
  'messages_received',
  'messages_sent',
  'retained_messages_count',
  'subscriptions_count',
  'heap_current',
  'bytes_received',
  'bytes_sent',
];

var cells = {};
for (var i = 0; i < metrics.length; i++) {
  cells[metrics[i]] = {
    type: 'value',
    value: 0,
    order: i + 1,
  };
}

cells['restart'] = {
  type: 'pushbutton',
  order: metrics.length + 1,
};

defineVirtualDevice('mosquitto', {
  title: 'Mosquitto',
  cells: cells,
});

trackMqtt('$SYS/broker/#', function(message) {
  metric = message.topic.split('/').slice(2).join('_').replace(' ', '_');
  if (metrics.indexOf(metric) > -1) {
    dev['mosquitto'][metric] = parseInt(message.value);
  }
});

defineRule('mosquitto_restart', {
  whenChanged: 'mosquitto/restart',
  then: function (newValue, devName, cellName) {
    runShellCommand('systemctl restart mosquitto &');
  },
});
