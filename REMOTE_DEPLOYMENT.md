# CraftFlow Remote Deployment Guide

This comprehensive guide will help you deploy CraftFlow to a remote server (e.g., DigitalOcean droplet) using Docker Compose, Caddy with Cloudflare DNS support, MinIO, and Cloudflare.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Deployment Steps](#detailed-deployment-steps)
- [Configuration Details](#configuration-details)
- [Services Overview](#services-overview)
- [Security Hardening](#security-hardening)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)
- [Additional Resources](#additional-resources)

## Prerequisites

- A server/VPS (e.g., DigitalOcean droplet)
- A domain name configured with Cloudflare
- SSH access to your server
- Basic knowledge of command line and Docker

## Quick Start

For experienced users, here's the condensed deployment process:

```bash
# 1. Server Setup
ssh root@your_server_ip
apt update && apt upgrade -y
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
apt install docker-compose -y

# 2. Configure Cloudflare DNS
# Add A record: @ → your_server_ip (Proxied - orange cloud)
# Get API token: Dashboard → Profile → API Tokens

# 3. Deploy Application
cd /opt
git clone <your-repo> craftflow
cd craftflow
cp env.example .env
nano .env  # Update all values!
docker-compose build
docker-compose up -d

# 4. Verify
docker-compose ps
docker-compose logs -f
```

**Access your application:**
- Frontend: https://yourdomain.com
- API Docs: https://yourdomain.com/api/docs
- Health: https://yourdomain.com/api/health

## Detailed Deployment Steps

### Step 1: Set Up Server

1. **Create a Droplet/VPS**
   - For DigitalOcean: Create a new Droplet
   - Choose Ubuntu 22.04 LTS
   - Recommended size: 2GB RAM minimum (4GB recommended for better performance)
   - Add your SSH key for secure access

2. **Connect to Your Server**
   ```bash
   ssh root@your_server_ip
   ```

3. **Update the System**
   ```bash
   apt update && apt upgrade -y
   ```

4. **Install Docker and Docker Compose**
   ```bash
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh

   # Install Docker Compose
   apt install docker-compose -y

   # Add your user to docker group (if not using root)
   usermod -aG docker $USER
   ```

### Step 2: Configure Cloudflare DNS

1. **Add DNS Records**
   - Log into Cloudflare dashboard
   - Go to your domain's DNS settings
   - Add an A record:
     - Name: `@` (or `yourdomain.com`)
     - Content: Your server IP address
     - Proxy status: Proxied (orange cloud) - This enables Cloudflare's CDN and DDoS protection
     - TTL: Auto

   - Optionally add a CNAME for www:
     - Name: `www`
     - Content: `yourdomain.com`
     - Proxy status: Proxied
     - TTL: Auto

2. **Get Cloudflare API Token (Recommended for automatic SSL)**
   - Go to Cloudflare Dashboard → My Profile → API Tokens
   - Click "Create Token"
   - Use "Edit zone DNS" template
   - Select your zone
   - Create token and copy it (you'll need it later)

### Step 3: Deploy the Application

1. **Clone Your Repository**
   ```bash
   cd /opt
   git clone <your-repo-url> craftflow
   cd craftflow
   ```

   Or if you're uploading files manually:
   ```bash
   mkdir -p /opt/craftflow
   cd /opt/craftflow
   # Upload your files here using scp or rsync
   ```

2. **Configure Environment Variables**
   ```bash
   cp env.example .env
   nano .env  # or use your preferred editor
   ```

   Update the following required values:
   ```env
   DOMAIN=yourdomain.com
   BASE_URL=https://yourdomain.com
   VITE_API_URL=/api
   POSTGRES_PASSWORD=<generate-a-strong-password>
   JWT_SECRET_KEY=<generate-with: openssl rand -hex 32>
   MINIO_ROOT_PASSWORD=<generate-a-strong-password>
   CLOUDFLARE_API_TOKEN=<your-cloudflare-api-token>
   ```

3. **Review Caddyfile**
   ```bash
   nano Caddyfile
   ```
   Make sure `{env.DOMAIN}, www.{env.DOMAIN}` match Cloudflare settings.

4. **Build and Start Services**
   ```bash
   docker-compose build
   docker-compose up -d
   ```

5. **Check Service Status**
   ```bash
   docker-compose ps
   docker-compose logs -f  # Watch logs
   ```

### Step 4: Configure Caddy with Cloudflare DNS Challenge

The custom Caddy image includes the Cloudflare DNS plugin, so you can use DNS-01 challenges for SSL certificates.

1. **Review Caddyfile** to use Cloudflare DNS challenge:
   ```caddy
   {env.DOMAIN}, www.{env.DOMAIN} {
       # Cloudflare DNS challenge for SSL
       tls {
           dns cloudflare {env.CLOUDFLARE_API_TOKEN}
       }

       # Logging
       log {
           output file /var/log/caddy/access.log
           format json
       }

       # Reverse proxy for API
       handle /api/* {
           uri strip_prefix /api
           reverse_proxy backend:8000 {
               header_up Host {host}
               header_up X-Real-IP {remote}
               header_up X-Forwarded-For {remote}
               header_up X-Forwarded-Proto {scheme}
           }
       }

       # Serve frontend static files
       handle {
           reverse_proxy frontend:80 {
               header_up Host {host}
               header_up X-Real-IP {remote}
               header_up X-Forwarded-For {remote}
               header_up X-Forwarded-Proto {scheme}
           }
       }
   }
   ```

2. **Ensure CLOUDFLARE_API_TOKEN is in .env**:
   ```env
   CLOUDFLARE_API_TOKEN=your_cloudflare_api_token_here
   ```

3. **Rebuild Caddy container** (if needed):
   ```bash
   docker-compose build caddy
   docker-compose up -d caddy
   ```

**Alternative SSL Options:**

- **Option A: Cloudflare SSL (Easier)**
  - Keep Cloudflare proxy enabled (orange cloud)
  - Caddy can use HTTP challenge since Cloudflare will proxy the request
  - Cloudflare will handle SSL termination

- **Option B: Origin Certificates (Advanced)**
  - Generate Cloudflare Origin Certificate
  - Use it with Caddy for end-to-end encryption

### Step 5: Initialize Database

The database schema should be automatically initialized from the `db/schema` directory when the PostgreSQL container is first created. Verify:

```bash
docker-compose exec postgres psql -U craftflow_user -d craftflow_db -c "\dt"
```

If tables don't exist, you can use the refresh script:

```bash
# Refresh database in Docker (⚠️ This will delete all data!)
./scripts/refresh_db_docker.sh
```

Or manually run schema files:

```bash
# Copy schema files to container
docker cp db/schema postgres:/tmp/schema

# Execute schema files
docker-compose exec postgres bash -c "for f in /tmp/schema/*.sql; do psql -U craftflow_user -d craftflow_db -f \$f; done"
```

**⚠️ Warning**: The refresh script will permanently delete all data. Use with caution!

### Step 6: Access Your Application

1. **Frontend**: https://yourdomain.com
2. **API Docs**: https://yourdomain.com/api/docs
3. **MinIO Console**: Access via SSH tunnel (see Security section below)
   - Default credentials are in your `.env` file

## Configuration Details

### Deployment Files

#### Core Deployment Files
- **`docker-compose.yml`** - Orchestrates all services (PostgreSQL, MinIO, Backend, Frontend, Caddy)
- **`Caddyfile`** - Reverse proxy configuration with automatic SSL
- **`env.example`** - Environment variable template (copy to `.env` and configure)
- **`caddy/Dockerfile`** - Custom Caddy build with Cloudflare DNS plugin

#### Dockerfiles
- **`backend/Dockerfile`** - Backend FastAPI application container
- **`frontend/Dockerfile`** - Frontend React application container (multi-stage build)
- **`frontend/nginx.conf`** - Nginx configuration for serving frontend

#### Deployment Scripts
- **`deploy.sh`** - Helper script for common deployment tasks
- **`scripts/refresh_db_docker.sh`** - Database refresh script (⚠️ deletes all data)

### Environment Variables

Required environment variables in `.env`:

- `DOMAIN` - Your domain name
- `BASE_URL` - Full URL (e.g., https://yourdomain.com)
- `VITE_API_URL` - API URL path (usually `/api`)
- `POSTGRES_PASSWORD` - Strong password for PostgreSQL
- `JWT_SECRET_KEY` - Generate with: `openssl rand -hex 32`
- `MINIO_ROOT_PASSWORD` - Strong password for MinIO
- `CLOUDFLARE_API_TOKEN` - Cloudflare API token for DNS challenges (optional but recommended)

## Services Overview

The deployment includes the following services:

- **PostgreSQL** - Database (port 5432 internal)
  - Container: `craftflow-postgres`
  - Database: `craftflow_db`
  - User: `craftflow_user`

- **MinIO** - Object storage for images (ports 9000/9001)
  - Container: `craftflow-minio`
  - Console: Port 9001 (access via SSH tunnel)
  - Bucket: `craftflow-uploads` (default)

- **Backend** - FastAPI application (port 8000 internal)
  - Container: `craftflow-backend`
  - Health check: `/health` endpoint

- **Frontend** - React application (port 80 internal)
  - Container: `craftflow-frontend`
  - Served via Nginx

- **Caddy** - Reverse proxy with automatic SSL (ports 80/443)
  - Container: `craftflow-caddy`
  - Custom build with Cloudflare DNS plugin
  - Automatic SSL certificate management

## Security Hardening

### 1. Firewall Configuration

```bash
# Install UFW
apt install ufw -y

# Allow SSH
ufw allow 22/tcp

# Allow HTTP/HTTPS (handled by Cloudflare, but good to have)
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable
```

### 2. Change Default Passwords

- Update MinIO root credentials in `.env`
- Update PostgreSQL password in `.env`
- Update JWT secret key in `.env`

### 3. Restrict MinIO Console Access

- Don't expose MinIO console port (9001) publicly
- Access it via SSH tunnel: `ssh -L 9001:localhost:9001 root@your_server_ip`
  - Then open: http://localhost:9001
- Or set up a separate subdomain with authentication

### 4. Regular Backups

```bash
# Create backup script
cat > /opt/backup-craftflow.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups"
mkdir -p $BACKUP_DIR

# Backup database
docker-compose exec -T postgres pg_dump -U craftflow_user craftflow_db > $BACKUP_DIR/db_$(date +%Y%m%d_%H%M%S).sql

# Backup MinIO data (optional)
# docker-compose exec -T minio mc mirror /data $BACKUP_DIR/minio_$(date +%Y%m%d_%H%M%S)

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
EOF

chmod +x /opt/backup-craftflow.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/backup-craftflow.sh") | crontab -
```

### Security Best Practices

- Change all default passwords in `.env`
- Use strong JWT secret key
- Don't expose MinIO console publicly
- Enable firewall on server
- Use Cloudflare proxy for DDoS protection
- Keep Docker and system updated

## Monitoring and Maintenance

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f caddy
docker-compose logs -f postgres
docker-compose logs -f minio
```

### Update Application

```bash
cd /opt/craftflow
git pull  # if using git
docker-compose build
docker-compose up -d
```

### Restart Services

```bash
# Restart specific service
docker-compose restart backend
docker-compose restart frontend
docker-compose restart caddy

# Restart all services
docker-compose restart
```

### Check Resource Usage

```bash
docker stats
```

### Common Commands

```bash
# View logs
docker-compose logs -f [service-name]

# Restart service
docker-compose restart [service-name]

# Stop everything
docker-compose down

# Start everything
docker-compose up -d

# Backup database
docker-compose exec -T postgres pg_dump -U craftflow_user craftflow_db > backup.sql

# Refresh database (⚠️ WARNING: Deletes all data!)
./scripts/refresh_db_docker.sh
```

## Troubleshooting

### Caddy SSL Certificate Issues

- Check Caddy logs: `docker-compose logs caddy`
- Verify DNS records point to your server: `dig yourdomain.com`
- Ensure port 80 and 443 are open: `ufw status`
- Check Cloudflare proxy settings
- Verify `CLOUDFLARE_API_TOKEN` is set correctly in `.env`
- Ensure Caddyfile has the correct domain name
- Rebuild Caddy if needed: `docker-compose build caddy && docker-compose up -d caddy`

**Common error**: "module not registered: dns.providers.cloudflare"
- Solution: The custom Caddy Dockerfile includes the Cloudflare plugin. Rebuild: `docker-compose build caddy`

### Can't Access Site

- Check DNS: `dig yourdomain.com`
- Check firewall: `ufw status`
- Check logs: `docker-compose logs caddy`
- Verify all services are running: `docker-compose ps`
- Check if domain is correctly set in Caddyfile

### Database Connection Issues

- Verify database is healthy: `docker-compose ps postgres`
- Check connection string in `.env`
- Test connection: `docker-compose exec postgres psql -U craftflow_user -d craftflow_db`
- View logs: `docker-compose logs postgres`

### MinIO Access Issues

- Verify MinIO is running: `docker-compose ps minio`
- Check MinIO logs: `docker-compose logs minio`
- Verify bucket exists: Access MinIO console at http://localhost:9001 (via SSH tunnel)
- Check credentials in `.env`

### Frontend Not Loading

- Check frontend logs: `docker-compose logs frontend`
- Verify API_URL is correct in `.env`
- Check browser console for errors
- Verify Caddy is routing correctly: `docker-compose logs caddy`
- Ensure backend is running: `docker-compose ps backend`

### Service Won't Start

- Check logs: `docker-compose logs [service-name]`
- Verify environment variables: `cat .env`
- Check container status: `docker-compose ps`
- Try rebuilding: `docker-compose build [service-name]`
- Check disk space: `df -h`

## Additional Resources

- [Caddy Documentation](https://caddyserver.com/docs/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [MinIO Documentation](https://min.io/docs/)
- [Cloudflare SSL Documentation](https://developers.cloudflare.com/ssl/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## Support

For issues specific to this deployment, check:

1. Service logs: `docker-compose logs [service-name]`
2. Container status: `docker-compose ps`
3. Network connectivity: `docker-compose exec backend ping postgres`
4. Environment variables: `cat .env`
5. Caddyfile syntax: `docker-compose exec caddy caddy validate --config /etc/caddy/Caddyfile`

