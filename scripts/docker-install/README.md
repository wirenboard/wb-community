# Скрипт установки Docker для контроллеров Wiren Board

Автоматизированный скрипт для установки Docker на контроллерах Wiren Board согласно [официальной инструкции](https://wiki.wirenboard.com/wiki/Docker).
Учитывает специфику контроллера:
- Перенос данных (/etc/docker, /var/lib/containerd) на ```/mnt/data``` (самый большой раздел флеш-накопителя)
- Хранение образов на встроенном накопителе в ```/mnt/data/.docker```
- Ограничение размера логов контейнеров (3 файла по 10M)
- Адаптация сетевых правил (iptables)

## Использование скрипта

### Установка Docker

```bash
./wb-docker-manager.sh --install
./wb-docker-manager.sh -i       # краткая форма
```

### Удаление Docker
```bash
./wb-docker-manager.sh --uninstall
./wb-docker-manager.sh -u       # краткая форма
```

### Справка
```bash
./wb-docker-manager.sh --help
```

## Описание

Скрипт выполняет полную установку и настройку Docker:

1. ✅ Установка необходимых зависимостей
2. ✅ Добавление репозитория Docker и GPG ключей
3. ✅ Настройка iptables для совместимости
4. ✅ Создание директорий на /mnt/data для экономии места на rootfs (встроенный флеш-накопитель контроллера разбит на разделы и для пользователя отведён самый большой из них, который монтируется в папку /mnt/data)
5. ✅ Настройка конфигурации daemon.json с ограничением логов
6. ✅ Установка docker-ce, docker-ce-cli и containerd.io
7. ✅ Проверка работоспособности с тестовым контейнером
8. ✅ Настройка автозапуска Docker

## Использование

### Установка через скачивание скрипта

1. Подключитесь к контроллеру через SSH:
   ```bash
   ssh root@192.168.42.1
   ```

2. Скачайте скрипт на контроллер:
   ```bash
   wget https://raw.githubusercontent.com/wb-community/refs/heads/main/scripts/docker-install/wb-docker-manager.sh
   ```

3. Сделайте скрипт исполняемым:
   ```bash
   chmod +x wb-docker-manager.sh
   ```

4. Запустите установку:
   ```bash
   ./wb-docker-manager.sh --install
   ```

### Прямая установка одной командой

```bash
wget -O - https://raw.githubusercontent.com/wb-community/refs/heads/main/scripts/docker-install/wb-docker-manager.sh | bash
```


## Требования

- Контроллер Wiren Board с доступом в интернет
- Права root (скрипт сам проверяет права)
- Свободное место на /mnt/data (минимум 500 МБ, рекомендуется 2 ГБ)

⚠️ **Важно:** Если размер rootfs вашего контроллера 1 ГБ, расширьте его до 2 ГБ по [инструкции](https://wiki.wirenboard.com/wiki/Enlarging_the_rootfs_partition).

## Что делать если возникла ошибка

Скрипт разработан с обработкой ошибок и выдаст понятное сообщение о том, что пошло не так:

### Ошибка подключения к интернету
```
Failed to update package list. Check internet connection
```
**Решение:** Проверьте сетевое подключение контроллера.

### Ошибка прав доступа
```
This script must be run as root. Use: sudo ./wb-docker-manager.sh
```
**Решение:** Запустите скрипт с правами root или через sudo.

### Docker daemon не запускается
```
Failed to start Docker daemon. Try 'systemctl status docker' for diagnostics.
```
**Решение:** Попробуйте перезагрузить контроллер командой `reboot`, затем проверьте статус:
```bash
systemctl status docker
```

### Тестовый контейнер не запускается
```
Failed to run test container. Output saved to /tmp/docker_test_output.txt.
You may need to reboot the controller using 'reboot'.
```
**Решение:** 
1. Перезагрузите контроллер: `reboot`
2. После перезагрузки проверьте: `docker run hello-world`
3. Если не помогло, проверьте логи: `journalctl -u docker -n 50`

## Проверка установки

После успешной установки вы увидите:
```
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║  ✓ Docker успешно установлен на контроллер Wiren Board!        ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

Проверить работу можно командой:
```bash
docker run hello-world
```

## Полезные команды

После установки Docker доступны следующие команды:

```bash
# Справка по командам
docker --help

# Список локальных образов
docker image ls

# Список контейнеров (всех)
docker ps -a

# Запуск контейнера
docker run -it --name mycontainer image_name

# Автозапуск контейнера
docker run -d --restart unless-stopped --name mycontainer image_name

# Остановка контейнера
docker stop mycontainer

# Удаление контейнера
docker rm mycontainer

# Удаление образа
docker rmi image_name
```

## Особенности установки на Wiren Board

1. **Хранение данных на /mnt/data**: Все образы и данные контейнеров хранятся на /mnt/data для экономии места на системном разделе.

2. **Ограничение логов**: В конфигурации установлены ограничения на размер логов контейнеров (максимум 3 файла по 10 МБ).

3. **Настройка iptables**: Для релизов wb-2304 и новее скрипт автоматически переключает iptables на legacy режим.

4. **Автозапуск**: Docker настроен на автоматический запуск при загрузке системы.

## Структура файлов после установки

```
/mnt/data/
├── .docker/              # Образы и слои Docker
├── etc/docker/           # Конфигурация Docker
│   └── daemon.json
└── var/lib/containerd/   # Данные containerd

/etc/docker -> /mnt/data/etc/docker (симлинк)
/var/lib/containerd -> /mnt/data/var/lib/containerd (симлинк)
```

## Дополнительные ресурсы

- [Официальная документация Wiren Board по Docker](https://wiki.wirenboard.com/wiki/Docker)
- [Установка Home Assistant через Docker](https://wiki.wirenboard.com/wiki/Home_Assistant)
- [Документация Docker](https://docs.docker.com/)

## Поддержка

При возникновении проблем:
1. Проверьте логи установки
2. Изучите вывод команды `systemctl status docker`
3. Просмотрите логи Docker: `journalctl -u docker -n 100`
4. Обратитесь к [официальной документации](https://wiki.wirenboard.com/wiki/Docker)
