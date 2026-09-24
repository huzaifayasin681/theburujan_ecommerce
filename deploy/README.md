# The Burujan Ecommerce - Hostinger VPS Deployment Guide

Production deployment guide for **The Burujan** on a Hostinger VPS with domain **`theburujan.shop`**.

---

## 1. Architecture Overview

```
                                      [ Internet ]
                                           │
                                  HTTPS (Port 443)
                                           │
                             ┌─────────────▼─────────────┐
                             │       Nginx Reverse       │
                             │     Proxy + Let's Encrypt │
                             └─────────────┬─────────────┘
                                           │
                     ┌─────────────────────┴─────────────────────┐
                     │                                           │
            Proxy to / (Port 3000)                    Proxy to /api/v1/ (Port 4000)
                     │                                           │
         ┌───────────▼───────────┐                   ┌───────────▼───────────┐
         │     Next.js Web       │                   │      NestJS API       │
         │   (Frontend App)      ├───────────────────►   (Backend Server)    │
         └───────────────────────┘    Internal       └───────────┬───────────┘
                                      Network                    │
                                                ┌────────────────┼────────────────┐
                                                │                │                │
                                         ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
                                         │  MySQL 8.4  │  │  Redis 7.4  │  │    MinIO    │
                                         │ (Database)  │  │   (Cache)   │  │ (S3 Storage)│
                                         └─────────────┘  └─────────────┘  └─────────────┘
```

---

## 2. Phase 1: DNS Configuration in Hostinger

Log in to **hPanel** (Hostinger Control Panel) -> **Domains** -> **`theburujan.shop`** -> **DNS / Nameservers**:

1. Note down your **Hostinger VPS Public IP Address** (e.g. `123.45.67.89`).
2. Add or edit the following **A Records**:

| Type | Name | Points to (Value) | TTL |
| :--- | :--- | :--- | :--- |
| **A** | `@` | `<YOUR_VPS_IP>` | 300 (or Default) |
| **A** | `www` | `<YOUR_VPS_IP>` | 300 (or Default) |

*(Wait 5–15 minutes for DNS propagation. You can verify on your local terminal using `dig theburujan.shop +short` or `nslookup theburujan.shop`).*

---

## 3. Phase 2: Connecting & Provisioning the VPS

1. Connect to your VPS via SSH:
   ```bash
   ssh root@<YOUR_VPS_IP>
   ```

2. Clone or navigate to the project directory:
   ```bash
   # If cloning via Git:
   git clone <YOUR_GIT_REPO_URL> /var/www/theburujan
   cd /var/www/theburujan
   ```

3. Run the automated provisioning script:
   ```bash
   chmod +x deploy/setup.sh deploy/deploy.sh
   ./deploy/setup.sh
   ```
   *This script automatically installs Docker Engine, Docker Compose Plugin, Nginx, Certbot, and configures the UFW firewall for ports 22, 80, and 443.*

---

## 4. Phase 3: Production Environment Setup

1. Copy the production environment template:
   ```bash
   cp .env.production.example .env
   ```

2. Generate secure random secrets on your terminal:
   ```bash
   openssl rand -hex 32   # Use for JWT_ACCESS_SECRET
   openssl rand -hex 32   # Use for JWT_REFRESH_SECRET
   openssl rand -base64 24 # Use for MYSQL_PASSWORD & MYSQL_ROOT_PASSWORD
   openssl rand -base64 24 # Use for S3_SECRET_KEY
   ```

3. Open `.env` and fill in the values:
   ```bash
   nano .env
   ```
   Ensure:
   - `APP_URL=https://theburujan.shop`
   - `CORS_ORIGINS=https://theburujan.shop,https://www.theburujan.shop`
   - `COOKIE_DOMAIN=.theburujan.shop`
   - `MYSQL_PASSWORD` and `MYSQL_ROOT_PASSWORD` are set
   - `SEED_SUPER_ADMIN_EMAIL=admin@theburujan.shop`
   - `SEED_SUPER_ADMIN_PASSWORD=YourSecurePassword123!`

---

## 5. Phase 4: Build & Launch Containers

Run the deployment script:
```bash
./deploy/deploy.sh
```

Or manually:
```bash
# 1. Build and start containers in the background
docker compose -f docker-compose.prod.yml up --build -d

# 2. Verify all containers are running
docker compose -f docker-compose.prod.yml ps

# 3. Seed initial roles, permissions, and your super admin account
docker compose -f docker-compose.prod.yml exec -T api npm run prisma:seed
```

---

## 6. Phase 5: Nginx & SSL Certificate (Let's Encrypt)

1. Put the initial HTTP Nginx configuration in place:
   ```bash
   sudo cp deploy/initial-http.conf /etc/nginx/sites-available/theburujan.shop
   sudo ln -sf /etc/nginx/sites-available/theburujan.shop /etc/nginx/sites-enabled/
   sudo rm -f /etc/nginx/sites-enabled/default
   sudo nginx -t && sudo systemctl reload nginx
   ```

2. Request your free SSL certificate using Certbot:
   ```bash
   sudo certbot --nginx -d theburujan.shop -d www.theburujan.shop
   ```
   *(Enter your email address and agree to the Terms of Service. Certbot will automatically issue and install the certificates).*

3. Now apply the full hardened production Nginx configuration:
   ```bash
   sudo cp deploy/theburujan.shop.conf /etc/nginx/sites-available/theburujan.shop
   sudo nginx -t && sudo systemctl reload nginx
   ```

4. Verify automatic SSL renewal is enabled:
   ```bash
   sudo systemctl status certbot.timer
   ```

---

## 7. Phase 6: Post-Deployment Smoke Test

Visit the following in your browser:
- Storefront: `https://theburujan.shop`
- Admin Dashboard: `https://theburujan.shop/admin`
- API Health Check: `https://theburujan.shop/api/v1/health`

---

## 8. Routine Operations & Updates

### Pushing Code Updates
When you make changes locally and push to your git repository:
```bash
ssh root@<YOUR_VPS_IP>
cd /var/www/theburujan
git pull origin master
./deploy/deploy.sh
```

### Viewing Logs
```bash
# All logs
docker compose -f docker-compose.prod.yml logs -f

# Just API logs
docker compose -f docker-compose.prod.yml logs -f api

# Just Web logs
docker compose -f docker-compose.prod.yml logs -f web
```

### Backing Up the Database
```bash
docker compose -f docker-compose.prod.yml exec -T mysql mysqldump -u burujan -p burujan > backup_$(date +%F).sql
```
