# Пример скрипта для прокидывания данных из Sprut.hub'а в Wiren Board.

Тестировалось на ревизии Sprut.hub'а [beta] 1.10.2 (13067).

Сперва неоходимо в Sprut.hub'е создать мост. Выбрать тип "MQTT". 

![alt text](SH_add_Bridge.png)

В настройках моста перейти в раздел "Экспертные" и указать перфикс, например,  "Sprut.hub_MQTT_Bridge".

![alt text](Settings_Bridge.png)

В правиле реализована возможность добавления WB-MSW-ZIGBEE v4.

Необходимо заполнить префикс моста (SH_Bridge_Name), номера аксессуаров Sprut.hub'а (SH_Device_Name), которые хотите добавить в Wiren Board. А также указать необходимые наименования виртуальных устройств (VD_Name) в Wiren Board.

Если модель добавляемого аксессуара в самом топике Sprut.hub'а не 'WB-MSW', то виртуальное устройство не будет создано. Пример топика, куда публикуется модель аксессуара: `Sprut.hub-MQTT_Bridge/accessories/85/1/6`

![alt text](wb-sh2wb-msw-zigbee.png)
