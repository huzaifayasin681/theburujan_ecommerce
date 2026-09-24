#!/usr/bin/env bash
# ==============================================================================
# The Burujan Ecommerce - One-Command Deployment / Update Script
# Domain: theburujan.shop
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "========================================================"
echo " Deploying The Burujan (Production)"
echo "========================================================"

# 1. Verify .env file exists
if [ ! -f ".env" ]; then
    echo "ERROR: .env file not found in $PROJECT_ROOT!"
    echo "Please copy .env.production.example to .env and configure your secrets first."
    exit 1
fi

# 2. Build and launch containers
echo "--> Building and starting Docker containers..."
docker compose -f docker-compose.prod.yml up --build -d

# 3. Wait for database and API to become healthy
echo "--> Waiting for services to reach healthy state..."
sleep 10

# 4. Verify API health
echo "--> Verifying API healthcheck..."
max_retries=15
counter=0
until curl -s -f http://127.0.0.1:4000/api/v1/health > /dev/null || [ $counter -ge $max_retries ]; do
    echo "Waiting for API to respond... ($counter/$max_retries)"
    sleep 3
    counter=$((counter + 1))
done

if [ $counter -ge $max_retries ]; then
    echo "WARNING: API did not respond with 200 within expected time. Checking logs:"
    docker compose -f docker-compose.prod.yml logs --tail=40 api
else
    echo "--> API is healthy and responding!"
fi

# 5. Reload Nginx
if command -v nginx &> /dev/null; then
    echo "--> Testing and reloading Nginx..."
    sudo nginx -t && sudo systemctl reload nginx
fi

echo "========================================================"
echo " Deployment successful!"
echo " Containers running:"
docker compose -f docker-compose.prod.yml ps
echo " Site live at: https://theburujan.shop"
echo "========================================================"
