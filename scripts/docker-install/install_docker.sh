#!/bin/bash

# Script to install Docker on a Wiren Board controller                #
# Based on the instructions: https://wiki.wirenboard.com/wiki/Docker  #

set -e  # Exit on error

# Output colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print error messages
error_exit() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
    exit 1
}

# Function to print warnings
warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Function to print success messages
success() {
    echo -e "${GREEN}[OK] $1${NC}"
}

# Function to print informational messages
info() {
    echo -e "[INFO] $1"
}

# Show usage
usage() {
    echo "Usage: $0 [--uninstall|-u]"
    echo ""
    echo "Options:"
    echo "  (no arguments)   Install Docker on the Wiren Board controller"
    echo "  --uninstall, -u  Stop, disable and remove Docker and all related files"
    echo ""
    exit 0
}

# Check for root privileges
if [ "$EUID" -ne 0 ]; then 
    error_exit "This script must be run as root. Use: sudo $0"
fi

# Parse arguments
ACTION="install"
for arg in "$@"; do
    case "$arg" in
        --uninstall|-u) ACTION="uninstall" ;;
        --help|-h) usage ;;
        *) error_exit "Unknown argument: $arg. Run '$0 --help' for usage." ;;
    esac
done

# Install function 
cmd_install() {

info "Starting Docker installation on the Wiren Board controller..."

# 1. Preparation for installation  
info "Step 1: Installing dependencies..."
if ! apt update; then
    error_exit "Failed to update package list. Check internet connection."
fi

if ! apt install -y ca-certificates curl gnupg lsb-release iptables; then
    error_exit "Failed to install required dependencies."
fi
success "Dependencies installed"

info "Step 2: Adding Docker repository GPG key..."
TMP_KEY="/usr/share/keyrings/docker-archive-keyring.gpg.tmp"
if curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o "$TMP_KEY"; then
    if mv -f "$TMP_KEY" /usr/share/keyrings/docker-archive-keyring.gpg; then
        success "GPG key added (overwritten if existed)"
    else
        rm -f "$TMP_KEY"
        error_exit "Failed to move GPG key to /usr/share/keyrings/docker-archive-keyring.gpg"
    fi
else
    rm -f "$TMP_KEY"
    error_exit "Failed to download Docker repository GPG key. Check internet connection."
fi

info "Step 3: Adding Docker repository..."
ARCH=$(dpkg --print-architecture)
CODENAME=$(lsb_release -cs)
echo "deb [arch=${ARCH} signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian ${CODENAME} stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
if [ ! -f /etc/apt/sources.list.d/docker.list ]; then
    error_exit "Failed to create Docker repository file."
fi
success "Docker repository added"

info "Step 4: Configure iptables for Docker compatibility..."
# Check if the update-alternatives command exists
if command -v update-alternatives &> /dev/null; then
    # Check for iptables-legacy
    if [ -f /usr/sbin/iptables-legacy ]; then
        update-alternatives --set iptables /usr/sbin/iptables-legacy || warning "Failed to switch iptables to legacy version"
    fi
    if [ -f /usr/sbin/ip6tables-legacy ]; then
        update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy || warning "Failed to switch ip6tables to legacy version"
    fi
    success "iptables configured"
else
    warning "update-alternatives not found, skipping iptables configuration"
fi

# 2. Preliminary configuration
info "Step 5: Creating Docker directories on /mnt/data..."

# Create directory for Docker configuration
if [ ! -d /mnt/data/etc/docker ]; then
    if ! mkdir -p /mnt/data/etc/docker; then
        error_exit "Failed to create directory /mnt/data/etc/docker"
    fi
fi

# Create symlink for configuration
if [ ! -L /etc/docker ]; then
    if [ -d /etc/docker ]; then
        warning "/etc/docker already exists as a directory, removing..."
        rm -rf /etc/docker
    fi
    if ! ln -s /mnt/data/etc/docker /etc/docker; then
        error_exit "Failed to create symlink /etc/docker"
    fi
fi
success "Configuration directory set up"

# Create directory for containerd
if [ ! -d /mnt/data/var/lib/containerd ]; then
    if ! mkdir -p /mnt/data/var/lib/containerd; then
        error_exit "Failed to create directory /mnt/data/var/lib/containerd"
    fi
fi

# Create symlink for containerd
if [ ! -L /var/lib/containerd ]; then
    if [ -d /var/lib/containerd ]; then
        warning "/var/lib/containerd already exists as a directory, removing..."
        rm -rf /var/lib/containerd
    fi
    if ! ln -s /mnt/data/var/lib/containerd /var/lib/containerd; then
        error_exit "Failed to create symlink /var/lib/containerd"
    fi
fi
success "containerd directory set up"

# Create directory for Docker images
info "Step 6: Creating directory to store Docker images..."
if [ ! -d /mnt/data/.docker ]; then
    if ! mkdir -p /mnt/data/.docker; then
        error_exit "Failed to create directory /mnt/data/.docker"
    fi
fi
success "Images directory created"

# Create daemon.json configuration file
info "Step 7: Creating daemon.json configuration file..."
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
    error_exit "Failed to create /etc/docker/daemon.json"
fi
success "daemon.json configuration file created"

# 3. Install Docker
info "Step 8: Updating package list..."
if ! apt update; then
    error_exit "Failed to update package list before installing Docker."
fi

info "Step 9: Installing Docker (this may take a few minutes)..."
if ! apt install -y docker-ce docker-ce-cli containerd.io; then
    error_exit "Failed to install Docker. Check internet connection and repository availability."
fi
success "Docker installed"

# 4. Verify installation
info "Step 10: Verifying Docker..."

# Wait for Docker daemon to start
sleep 2

# Try to start Docker if it's not running
if ! systemctl is-active --quiet docker; then
    info "Docker daemon is not active, attempting to start..."
    if ! systemctl start docker; then
        error_exit "Failed to start Docker daemon. Try 'systemctl status docker' for diagnostics."
    fi
    sleep 2
fi

# Check for possible iptables conflict
if ! docker info &> /dev/null; then
    warning "Docker daemon may have issues with iptables, applying workaround..."
    if iptables -w10 -t nat -I POSTROUTING -s 172.17.0.0/16 ! -o docker0 -j MASQUERADE 2>/dev/null; then
        success "iptables rule added"
        systemctl restart docker
        sleep 2
    fi
fi

# Run test container
info "Running test container hello-world..."
if docker run --rm hello-world &> /tmp/docker_test_output.txt; then
    if grep -q "Hello from Docker!" /tmp/docker_test_output.txt; then
        success "Test container ran successfully!"
        echo ""
        cat /tmp/docker_test_output.txt
        echo ""
        rm -f /tmp/docker_test_output.txt
    else
        warning "Container ran but did not return the expected output"
        cat /tmp/docker_test_output.txt
        rm -f /tmp/docker_test_output.txt
    fi
else
    error_exit "Failed to run test container. Output saved to /tmp/docker_test_output.txt.\nYou may need to reboot the controller using 'reboot'."
fi

# Enable Docker autostart
info "Step 11: Enabling Docker autostart..."
if systemctl enable docker; then
    success "Docker will start automatically on boot"
else
    warning "Failed to enable Docker autostart"
fi

# Summary
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                                ║${NC}"
echo -e "${GREEN}║  ✓ Docker has been successfully installed on the Wiren Board!  ║${NC}"
echo -e "${GREEN}║                                                                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
info "Useful commands:"
echo "  - Show help:                  docker --help"
echo "  - List images:                docker image ls"
echo "  - List containers:            docker ps -a"
echo "  - Run a container:            docker run [options] [image]"
echo "  - Stop a container:           docker stop [name/id]"
echo "  - Remove a container:         docker rm [name/id]"
echo ""
info "Additional information:"
echo "  - Wiki: https://wiki.wirenboard.com/wiki/Docker"
echo "  - Images are stored in: /mnt/data/.docker"
echo "  - Configuration: /etc/docker/daemon.json"
echo ""
warning "If something doesn't work correctly, try rebooting the controller: reboot"
echo ""

} # end cmd_install

# Uninstall function
cmd_uninstall() {
    info "Starting Docker uninstallation from the Wiren Board controller..."

    # Stop and remove all containers and images
    info "Step 1: Stopping and removing all containers and images..."
    if command -v docker &>/dev/null && systemctl is-active --quiet docker 2>/dev/null; then
        CONTAINERS=$(docker ps -aq 2>/dev/null)
        if [ -n "$CONTAINERS" ]; then
            info "Stopping all running containers..."
            docker stop $CONTAINERS || warning "Some containers could not be stopped"
            info "Removing all containers..."
            docker rm $CONTAINERS || warning "Some containers could not be removed"
            success "All containers removed"
        else
            info "No containers found"
        fi

        IMAGES=$(docker images -q 2>/dev/null)
        if [ -n "$IMAGES" ]; then
            warning "The following Docker images will be removed:"
            docker images --format "  - {{.Repository}}:{{.Tag}} ({{.Size}})"
            read -r -p "Remove all Docker images? [y/N] " confirm_images
            if [[ "$confirm_images" =~ ^[Yy]$ ]]; then
                docker rmi -f $IMAGES || warning "Some images could not be removed"
                success "All images removed"
            else
                info "Skipped removal of images"
            fi
        else
            info "No images found"
        fi
    else
        info "Docker is not running, skipping container/image cleanup"
    fi

    # Stop and disable Docker service
    info "Step 2: Stopping and disabling Docker service..."
    if systemctl is-active --quiet docker 2>/dev/null; then
        systemctl stop docker || warning "Failed to stop Docker service"
        success "Docker service stopped"
    else
        info "Docker service is not running, skipping stop"
    fi
    if systemctl is-enabled --quiet docker 2>/dev/null; then
        systemctl disable docker || warning "Failed to disable Docker autostart"
        success "Docker autostart disabled"
    fi

    # Remove Docker packages
    info "Step 3: Removing Docker packages..."
    apt purge -y docker-ce docker-ce-cli containerd.io \
        docker-buildx-plugin docker-compose-plugin 2>/dev/null || \
        warning "Some Docker packages were not found or could not be removed"
    apt autoremove -y || true
    success "Docker packages removed"

    # Remove Docker repository and GPG key
    info "Step 4: Removing Docker repository and GPG key..."
    rm -f /etc/apt/sources.list.d/docker.list
    rm -f /usr/share/keyrings/docker-archive-keyring.gpg
    apt update || true
    success "Repository and GPG key removed"

    # Remove symlinks
    info "Step 5: Removing symlinks..."
    if [ -L /etc/docker ]; then
        rm -f /etc/docker
        success "Removed symlink /etc/docker"
    fi
    if [ -L /var/lib/containerd ]; then
        rm -f /var/lib/containerd
        success "Removed symlink /var/lib/containerd"
    fi

    # Remove data directories (with confirmation)
    info "Step 6: Removing data directories from /mnt/data..."
    warning "This will permanently delete all Docker images, containers and configuration!"
    read -r -p "Delete /mnt/data/.docker, /mnt/data/var/lib/containerd and /mnt/data/etc/docker? [y/N] " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        rm -rf /mnt/data/.docker
        rm -rf /mnt/data/var/lib/containerd
        rm -rf /mnt/data/etc/docker
        success "Data directories removed"
    else
        info "Skipped removal of data directories"
    fi

    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                                ║${NC}"
    echo -e "${GREEN}║  ✓ Docker has been successfully removed from the Wiren Board!  ║${NC}"
    echo -e "${GREEN}║                                                                ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    warning "A reboot is recommended to ensure all changes take effect: reboot"
    echo ""

} # end cmd_uninstall

# Dispatch 

case "$ACTION" in
    install)   cmd_install ;;
    uninstall) cmd_uninstall ;;
esac

exit 0
