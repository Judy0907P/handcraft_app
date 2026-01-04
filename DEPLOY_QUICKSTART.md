# Quick Deployment Guide

This is a condensed version of the deployment guide for quick reference.

## 1. Server Setup (DigitalOcean)

```bash
# SSH into your server
ssh root@your_server_ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y
```

## 2. Cloudflare DNS

1. Add A record: `@` → your_server_ip (Proxied - orange cloud)
2. Optional: Get API token for automatic SSL (Dashboard → Profile → API Tokens)

## 3. Deploy Application

```bash
# Clone or upload files
cd /opt
git clone <your-repo> craftflow
cd craftflow

# Configure environment
cp env.example .env
nano .env  # Update all values!

# Update Caddyfile with your domain
nano Caddyfile  # Replace 'yourdomain.com'

# Build and start
docker-compose build
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f
```

## 4. Important Configuration

### .env file - Required changes:
- `DOMAIN` and `BASE_URL` - Your domain
- `POSTGRES_PASSWORD` - Strong password
- `JWT_SECRET_KEY` - Generate with: `openssl rand -hex 32`
- `MINIO_ROOT_PASSWORD` - Strong password
- `CLOUDFLARE_API_TOKEN` - Optional but recommended

### Caddyfile:
- Replace `yourdomain.com` with your actual domain

## 5. Verify Deployment

- Frontend: https://yourdomain.com
- API Docs: https://yourdomain.com/api/docs
- Health: https://yourdomain.com/api/health

## 6. Common Commands

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

**Can't access site:**
- Check DNS: `dig yourdomain.com`
- Check firewall: `ufw status`
- Check logs: `docker-compose logs caddy`

**SSL not working:**
- Verify domain in Caddyfile
- Check Cloudflare proxy settings
- Check Caddy logs for certificate errors

**Database issues:**
- Check health: `docker-compose ps postgres`
- View logs: `docker-compose logs postgres`
- Test connection: `docker-compose exec postgres psql -U craftflow_user -d craftflow_db`

## Access MinIO Console

```bash
# Via SSH tunnel (secure)
ssh -L 9001:localhost:9001 root@your_server_ip
# Then open: http://localhost:9001

# Or directly (less secure - only for testing)
# Access: http://your_server_ip:9001
```

Default credentials are in your `.env` file.

