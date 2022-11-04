## Скрипт для управления теплым полом с помощью модуля реле WB-MRWM2

Подробности в статье про [Автоматизацию теплого пола](https://wirenboard.com/ru/pages/floor_heating_control/).

Алгоритм управления работает следующим образом: если температура нагревательного элемента меньше минимальной установленной границы, то включается нагрев. Нагрев продолжается до тех пор, пока температура не достигнет максимальной установленной границы, после этого нагрев выключается. То есть температура нагревательного элемента будет поддерживаться в заданных границах, которые задаются в веб-интрефейсе в параметрах виртуального устройства теплого пола.

Алгоритм также реализует функцию защиты от короткого замыкания: в случае превышения допустимой мощности потребления, контур будет отключен и переключатель «Alarm» примет положение «On», дальнейшее продолжение работы нагрева будет возможно только после ручного переключения «Alarm» в положение «Off».

Для использования скрипта необходимо заменить символы "xxxxxxxx" на адрес датчика температуры с интерфейсом 1-wire и указать правильные id адреса modbus-устройств.

## Script for floor heating control using WB-MRWM2 relay module

Details in the article about [Automation of a warm floor](https://wirenboard.com/ru/pages/floor_heating_control/).

The control algorithm works as follows: if the temperature of the heating element is less than the minimum set limit, then the heating is turned on. Heating continues until the temperature reaches the maximum set limit, after which the heating is turned off. That is, the temperature of the heating element will be maintained within the specified limits, which are set in the web interface in the parameters of the virtual floor heating device.

The algorithm also implements the short circuit protection function: in case of exceeding the permissible power consumption, the circuit will be turned off and the “Alarm” switch will take the “On” position, further continuation of the heating operation will be possible only after manually switching “Alarm” to the “Off” position.

To use the script, you need to replace the characters "xxxxxxxx" with the address of the temperature sensor with the 1-wire interface and specify the correct id addresses of the modbus-devices.
