# Примеры интеграции с Home Assistant

Как пользоваться:
1. Установить эмулятор https://github.com/wirenboard/wb-dashboards-demo/tree/main/wb-rules-module
2. Создать новый скрипт wb-rules и вставить в него содержимое `script/ha-virtual-devices.js`.

После этого будут созданы виртуальные устройства.

Далее:
1. Установить Home Assistant по инструкции https://wirenboard.com/wiki/Home_Assistant
2. Вместо настройки связи с устройствами импортировать бэкап из файла `backup/automatic_backup_2025_6_2.tar`, ключ к распаковке `1LLB-K10V-Z73Q-LCD8-A2BM-YRQ6-TSPV`. Креды для входа в систему логин: `root`, пароль: `wirenboard`.

На всякий случай в папке `config` лежат файлы с описанием конфигурации, но при корректном импорте бэкапа они не понадобятся.
