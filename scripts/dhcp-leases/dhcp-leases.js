var iface = 'wlan0';
var devName = 'dhcp-leases-{}'.format(iface);

defineVirtualDevice(devName, {
  title: {
    en: 'DHCP leases {}'.format(iface),
    ru: 'DHCP аренды {}'.format(iface)
  },
  cells: {},
});

function _update_leases() {
  runShellCommand('cat /var/lib/NetworkManager/dnsmasq-{}.leases'.format(iface), {
    captureOutput: true,
    exitCallback: function (exitCode, captureOutput) {
      var device = getDevice(devName);
      var leases = [];

      function createOrUpdateLease(hwaddr, ipv4addr, hostname) {
        if (!device.isControlExists(hwaddr)) {
          device.addControl(hwaddr, {
            title: '{} ({})'.format(hwaddr, hostname),
            type: 'text',
            value: '',
          });
        }
        var control = device.getControl(hwaddr);
        runShellCommand('ping -q -W1 -c3 -I {} {} 2>/dev/null'.format(iface, ipv4addr), {
          captureOutput: false,
          exitCallback: function (exitCode) {
            control.setValue(ipv4addr);
            if (exitCode != 0) {
              control.setError('r');
            }
          },
        });
        leases.push(hwaddr);
      }

      var lines = captureOutput.split('\n');
      for (var index in lines) {
        var fields = lines[index].split(/\s+/);
        if (fields.length >= 4) {
          createOrUpdateLease(fields[1], fields[2], fields[3]);
        }
      }

      device.controlsList().forEach(function(ctrl) {
        if (leases.indexOf(ctrl.getId()) == -1) {
          device.removeControl(ctrl.getId());
        }
      });
    },
  });
}

setInterval(_update_leases, 5000)
