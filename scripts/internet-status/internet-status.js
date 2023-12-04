defineVirtualDevice('ping', {title: 'Проверка доступности', cells: {}});

function addChecker(topic, name, address, period) {
	getDevice('ping').addControl(topic, {title: name, type: 'switch', value: false, readonly: true});

	defineRule({when: cron(period), then: function () { ping(topic, address) }});

	ping(topic, address);
}

function ping(topic, address) {
	runShellCommand('ping -c 1 -W 1 ' + address + '> /dev/null; echo $?', {
		captureOutput: true,
		exitCallback: function (code, output) {
			dev['ping'][topic] = (output == 0);
		}
	});
};

/*
	Составление списка опрашиваемых ресурсов для отображения доступности в виртуальном устройстве.
	Параметры: свой топик, отображаемое имя, ip-адрес или домен, период опроса в формате cron.
*/

addChecker('repeater', 'Wi-fi репитер', '192.168.1.20', '@every 60s');
addChecker('global', 'Доступ в интернет', '8.8.8.8', '@every 60s');
addChecker('site', 'Yandex.ru', 'ya.ru', '@every 60s');