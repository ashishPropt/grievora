#!/bin/bash
# Grievora VPS Setup Script
# Run as root on a fresh Ubuntu 22.04 Vultr VPS

set -e

echo "=== Grievora Setup ==="

# System updates
apt-get update && apt-get upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PostgreSQL 14
apt-get install -y postgresql postgresql-contrib

# Install Redis
apt-get install -y redis-server

# Install Nginx
apt-get install -y nginx

# Install PM2
npm install -g pm2

# Configure PostgreSQL
systemctl enable postgresql
systemctl start postgresql

su - postgres -c "psql -c \"CREATE USER grievora WITH PASSWORD 'CHANGE_ME_DB_PASSWORD';\""
su - postgres -c "psql -c \"CREATE DATABASE grievora OWNER grievora;\""
su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE grievora TO grievora;\""

# Configure Redis
systemctl enable redis-server
systemctl start redis-server

# Create app directory
mkdir -p /opt/grievora

# Configure Nginx
cp /opt/grievora/nginx/nginx.conf /etc/nginx/sites-available/grievora
ln -sf /etc/nginx/sites-available/grievora /etc/nginx/sites-enabled/grievora
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "=== Setup complete. Next: clone repo, configure .env, run deploy.sh ==="
