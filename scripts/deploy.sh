#!/bin/bash
# Grievora Deploy Script
# Run from /opt/grievora after git pull

set -e
APP_DIR="/opt/grievora"
cd "$APP_DIR"

echo "=== Deploying Grievora ==="

# Run database migrations
echo "Running migrations..."
cd "$APP_DIR/backend"
node scripts/migrate.js

# Build and start backend
echo "Building backend..."
npm install --production=false
npm run build

# Build frontend
echo "Building frontend..."
cd "$APP_DIR/frontend"
npm install --production=false
npm run build

# Restart PM2 processes
cd "$APP_DIR"
pm2 start ecosystem.config.js --update-env || pm2 reload ecosystem.config.js --update-env

# Reload Nginx
nginx -t && systemctl reload nginx

echo "=== Deploy complete ==="
pm2 status
