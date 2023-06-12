var vent = require('ventilation2wb'); // подключаем модуль

var mqttTopics = {
  AI_T_AIR: 'wb-w1/28-00000978ba32', // Температура воздуха
  AI_T_WATER: 'wb-w1/28-000009795bc2', // Температура воды в «обратке»
  DI_NOT_FIRE: 'wb-mr6cv3_111/Input 0', // Сигнал «Пожар» от АУПС
  DI_PS_FILTER: 'wb-mr6cv3_111/Input 1', // Реле давления фильтра
  DI_PS_FAN: 'wb-mr6cv3_111/Input 2', // Реле давления вентилятора
  DI_OPEN: 'wb-mr6cv3_111/Input 3', // Заслонка открыта
  DI_CLOSED: 'wb-mr6cv3_111/Input 4', // Заслонка закрыта
  DI_TS_FAN: 'wb-mr6cv3_111/Input 5', // Термоконтакты вентилятора
  DI_HS: 'wb-mr6cv3_111/Input 6', // Выключатель с фиксацией «Пуск/Стоп»
  DO_OPEN: 'wb-mr6cv3_111/K1', // Реле заслонки
  DO_PUMP: 'wb-mr6cv3_111/K2', // Реле насоса
  DO_MORE: 'wb-mr6cv3_111/K3', // Реле вентиля «больше»
  DO_LESS: 'wb-mr6cv3_111/K4', // Реле вентиля «меньше»
  DO_FAN: 'wb-mr6cv3_111/K5', // Реле вентилятора
};

vent.init(mqttTopics);
