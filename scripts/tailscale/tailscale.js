defineVirtualDevice('tailscale', {
  title: 'Tailscale',
  cells: {},
});

function _update_peers() {
  runShellCommand('tailscale status --json', {
    captureOutput: true,
    exitCallback: function (exitCode, captureOutput) {
      var data = JSON.parse(captureOutput);
      var device = getDevice('tailscale');
      var peers = [];

      function createOrUpdatePeer(entity) {
        if (!device.isControlExists(entity.HostName)) {
          device.addControl(entity.HostName, {
            type: 'text',
            value: '',
          });
        }
        var control = device.getControl(entity.HostName);
        control.setValue(entity.TailscaleIPs[0]);
        if (!entity.Online) {
          control.setError('r');
        }
        peers.push(entity.HostName);
      }

      createOrUpdatePeer(data.Self);
      for (var nodekey in data.Peer) {
        createOrUpdatePeer(data.Peer[nodekey]);
      }

      device.controlsList().forEach(function(ctrl) {
        if (peers.indexOf(ctrl.getId()) == -1) {
          device.removeControl(ctrl.getId());
        }
      });
    },
  });
}

setInterval(_update_peers, 5000)
