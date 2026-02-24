#!/bin/bash

###############################################################################
# Скрипт установки Docker на контроллер Wiren Board
# Основано на инструкции: https://wiki.wirenboard.com/wiki/Docker
###############################################################################

set -e  # Прервать выполнение при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для вывода сообщений об ошибках
error_exit() {
    echo -e "${RED}[ОШИБКА] $1${NC}" >&2
    exit 1
}

# Функция для вывода предупреждений
warning() {
    echo -e "${YELLOW}[ПРЕДУПРЕЖДЕНИЕ] $1${NC}"
}

# Функция для вывода успешных сообщений
success() {
    echo -e "${GREEN}[OK] $1${NC}"
}

# Функция для вывода информационных сообщений
info() {
    echo -e "[INFO] $1"
}

# Проверка прав root
if [ "$EUID" -ne 0 ]; then 
    error_exit "Этот скрипт нужно запускать с правами root. Используйте: sudo $0"
fi

info "Начало установки Docker на контроллер Wiren Board..."

###############################################################################
# 1. ПОДГОТОВКА К УСТАНОВКЕ
###############################################################################

info "Шаг 1: Установка зависимостей..."
if ! apt update; then
    error_exit "Не удалось обновить список пакетов. Проверьте подключение к интернету."
fi

if ! apt install -y ca-certificates curl gnupg lsb-release iptables; then
    error_exit "Не удалось установить необходимые зависимости."
fi
success "Зависимости установлены"

info "Шаг 2: Добавление GPG ключа репозитория Docker..."
if ! curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg; then
    error_exit "Не удалось загрузить GPG ключ репозитория Docker. Проверьте подключение к интернету."
fi
success "GPG ключ добавлен"

info "Шаг 3: Добавление репозитория Docker..."
ARCH=$(dpkg --print-architecture)
CODENAME=$(lsb_release -cs)
echo "deb [arch=${ARCH} signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian ${CODENAME} stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
if [ ! -f /etc/apt/sources.list.d/docker.list ]; then
    error_exit "Не удалось создать файл репозитория Docker."
fi
success "Репозиторий Docker добавлен"

info "Шаг 4: Настройка iptables для совместимости с Docker..."
# Проверяем, существует ли команда update-alternatives
if command -v update-alternatives &> /dev/null; then
    # Проверяем наличие iptables-legacy
    if [ -f /usr/sbin/iptables-legacy ]; then
        update-alternatives --set iptables /usr/sbin/iptables-legacy || warning "Не удалось переключить iptables на legacy версию"
    fi
    if [ -f /usr/sbin/ip6tables-legacy ]; then
        update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy || warning "Не удалось переключить ip6tables на legacy версию"
    fi
    success "iptables настроены"
else
    warning "update-alternatives не найден, пропускаем настройку iptables"
fi

###############################################################################
# 2. ПРЕДВАРИТЕЛЬНАЯ НАСТРОЙКА
###############################################################################

info "Шаг 5: Создание директорий для Docker на /mnt/data..."

# Создание директории для конфигурации Docker
if [ ! -d /mnt/data/etc/docker ]; then
    if ! mkdir -p /mnt/data/etc/docker; then
        error_exit "Не удалось создать директорию /mnt/data/etc/docker"
    fi
fi

# Создание симлинка для конфигурации
if [ ! -L /etc/docker ]; then
    if [ -d /etc/docker ]; then
        warning "/etc/docker уже существует как директория, удаляем..."
        rm -rf /etc/docker
    fi
    if ! ln -s /mnt/data/etc/docker /etc/docker; then
        error_exit "Не удалось создать симлинк /etc/docker"
    fi
fi
success "Директория конфигурации настроена"

# Создание директории для containerd
if [ ! -d /mnt/data/var/lib/containerd ]; then
    if ! mkdir -p /mnt/data/var/lib/containerd; then
        error_exit "Не удалось создать директорию /mnt/data/var/lib/containerd"
    fi
fi

# Создание симлинка для containerd
if [ ! -L /var/lib/containerd ]; then
    if [ -d /var/lib/containerd ]; then
        warning "/var/lib/containerd уже существует как директория, удаляем..."
        rm -rf /var/lib/containerd
    fi
    if ! ln -s /mnt/data/var/lib/containerd /var/lib/containerd; then
        error_exit "Не удалось создать симлинк /var/lib/containerd"
    fi
fi
success "Директория containerd настроена"

# Создание директории для образов Docker
info "Шаг 6: Создание директории для хранения образов Docker..."
if [ ! -d /mnt/data/.docker ]; then
    if ! mkdir -p /mnt/data/.docker; then
        error_exit "Не удалось создать директорию /mnt/data/.docker"
    fi
fi
success "Директория для образов создана"

# Создание конфигурационного файла daemon.json
info "Шаг 7: Создание конфигурационного файла daemon.json..."
cat > /etc/docker/daemon.json <<EOF
{
  "data-root": "/mnt/data/.docker",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

if [ ! -f /etc/docker/daemon.json ]; then
    error_exit "Не удалось создать файл /etc/docker/daemon.json"
fi
success "Конфигурационный файл daemon.json создан"

###############################################################################
# 3. УСТАНОВКА DOCKER
###############################################################################

info "Шаг 8: Обновление списка пакетов..."
if ! apt update; then
    error_exit "Не удалось обновить список пакетов перед установкой Docker."
fi

info "Шаг 9: Установка Docker (это может занять несколько минут)..."
if ! apt install -y docker-ce docker-ce-cli containerd.io; then
    error_exit "Не удалось установить Docker. Проверьте подключение к интернету и доступность репозитория."
fi
success "Docker установлен"

###############################################################################
# 4. ПРОВЕРКА УСТАНОВКИ
###############################################################################

info "Шаг 10: Проверка работы Docker..."

# Ожидание запуска Docker daemon
sleep 2

# Попытка запустить Docker, если он не запущен
if ! systemctl is-active --quiet docker; then
    info "Docker daemon не запущен, пытаемся запустить..."
    if ! systemctl start docker; then
        error_exit "Не удалось запустить Docker daemon. Попробуйте выполнить 'systemctl status docker' для диагностики."
    fi
    sleep 2
fi

# Проверка возможного конфликта iptables
if ! docker info &> /dev/null; then
    warning "Docker daemon может иметь проблемы с iptables, применяем исправление..."
    if iptables -w10 -t nat -I POSTROUTING -s 172.17.0.0/16 ! -o docker0 -j MASQUERADE 2>/dev/null; then
        success "Правило iptables добавлено"
        systemctl restart docker
        sleep 2
    fi
fi

# Запуск тестового контейнера
info "Запуск тестового контейнера hello-world..."
if docker run --rm hello-world &> /tmp/docker_test_output.txt; then
    if grep -q "Hello from Docker!" /tmp/docker_test_output.txt; then
        success "Тестовый контейнер успешно запущен!"
        echo ""
        cat /tmp/docker_test_output.txt
        echo ""
        rm -f /tmp/docker_test_output.txt
    else
        warning "Контейнер запущен, но не вернул ожидаемый результат"
        cat /tmp/docker_test_output.txt
        rm -f /tmp/docker_test_output.txt
    fi
else
    error_exit "Не удалось запустить тестовый контейнер. Вывод сохранен в /tmp/docker_test_output.txt. \nВозможно, требуется перезагрузка контроллера командой 'reboot'."
fi

# Включение автозапуска Docker
info "Шаг 11: Настройка автозапуска Docker..."
if systemctl enable docker; then
    success "Docker будет автоматически запускаться при загрузке системы"
else
    warning "Не удалось настроить автозапуск Docker"
fi

###############################################################################
# ИТОГ
###############################################################################

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                                ║${NC}"
echo -e "${GREEN}║  ✓ Docker успешно установлен на контроллер Wiren Board!        ║${NC}"
echo -e "${GREEN}║                                                                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
info "Полезные команды:"
echo "  - Просмотр справки:           docker --help"
echo "  - Список образов:             docker image ls"
echo "  - Список контейнеров:         docker ps -a"
echo "  - Запуск контейнера:          docker run [параметры] [образ]"
echo "  - Остановка контейнера:       docker stop [имя/id]"
echo "  - Удаление контейнера:        docker rm [имя/id]"
echo ""
info "Дополнительная информация:"
echo "  - Wiki: https://wiki.wirenboard.com/wiki/Docker"
echo "  - Образы хранятся в: /mnt/data/.docker"
echo "  - Конфигурация: /etc/docker/daemon.json"
echo ""
warning "Если что-то работает неправильно, попробуйте перезагрузить контроллер: reboot"
echo ""

exit 0
