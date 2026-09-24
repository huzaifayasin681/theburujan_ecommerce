#!/usr/bin/env bash
# ==============================================================================
# Hostinger VPS Initial Server Provisioning Script
# Target OS: Ubuntu 22.04 / 24.04 LTS
# Domain: theburujan.shop
# ==============================================================================

set -euo pipefail

echo "========================================================"
echo " Starting Hostinger VPS Server Setup for The Burujan"
echo "========================================================"

# 1. Update and upgrade base system
echo "--> Updating system packages..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git ufw ca-certificates gnupg lsb-release

# 2. Install Docker and Docker Compose Plugin
echo "--> Installing official Docker Engine..."
if ! command -v docker &> /dev/null; then
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Enable Docker to run on boot
    sudo systemctl enable docker
    sudo systemctl start docker

    # Add current user to docker group if not root
    if [ "$USER" != "root" ]; then
        sudo usermod -aG docker "$USER"
        echo "User $USER added to docker group."
    fi
else
    echo "Docker is already installed."
fi

# 3. Install Nginx and Certbot (Let's Encrypt)
echo "--> Installing Nginx & Certbot..."
sudo apt install -y nginx certbot python3-certbot-nginx

# 4. Configure UFW Firewall
echo "--> Configuring Firewall (UFW)..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
# Ensure internal ports (3000, 4000, 3306, 6379) remain closed to public internet
sudo ufw --force enable
sudo ufw status verbose

# 5. Create Certbot ACME webroot directory
echo "--> Creating certbot webroot..."
sudo mkdir -p /var/www/certbot
sudo chown -R www-data:www-data /var/www/certbot

echo "========================================================"
echo " Initial server provisioning complete!"
echo " Docker: $(docker --version)"
echo " Docker Compose: $(docker compose version)"
echo " Nginx: $(nginx -v 2>&1)"
echo "========================================================"
