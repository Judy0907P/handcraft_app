# Deployment Files Overview

This directory contains all files needed to deploy CraftFlow to a remote server.

## Files Created

### Core Deployment Files
- **`docker-compose.yml`** - Orchestrates all services (PostgreSQL, MinIO, Backend, Frontend, Caddy)
- **`Caddyfile`** - Reverse proxy configuration with automatic SSL
- **`env.example`** - Environment variable template (copy to `.env` and configure)

### Dockerfiles
- **`backend/Dockerfile`** - Backend FastAPI application container
- **`frontend/Dockerfile`** - Frontend React application container (multi-stage build)
- **`frontend/nginx.conf`** - Nginx configuration for serving frontend

### Deployment Scripts
- **`deploy.sh`** - Helper script for common deployment tasks
- **`DEPLOYMENT.md`** - Detailed deployment guide
- **`DEPLOY_QUICKSTART.md`** - Quick reference guide

### Code Changes
- **`backend/app/storage.py`** - Updated to support MinIO/S3 storage
- **`backend/app/main.py`** - Added S3 image serving endpoint
- **`backend/app/routers/auth.py`** - Moved JWT secret to environment variable
- **`backend/requirements.txt`** - Added boto3 for S3 support

## Quick Start

1. **On your server:**
   ```bash
   git clone <your-repo>
   cd craftflow
   cp env.example .env
   # Edit .env with your settings
   # Edit Caddyfile with your domain
   docker-compose up -d
   ```

2. **Configure DNS:**
   - Point your domain to server IP
   - Use Cloudflare proxy (orange cloud) for DDoS protection

3. **Access:**
   - Frontend: https://yourdomain.com
   - API: https://yourdomain.com/api/docs
   - MinIO Console: http://server-ip:9001 (via SSH tunnel recommended)

## Services Included

- **PostgreSQL** - Database (port 5432 internal)
- **MinIO** - Object storage for images (port 9000/9001)
- **Backend** - FastAPI application (port 8000 internal)
- **Frontend** - React application (port 80 internal)
- **Caddy** - Reverse proxy with automatic SSL (ports 80/443)

## Security Notes

- Change all default passwords in `.env`
- Use strong JWT secret key
- Don't expose MinIO console publicly
- Enable firewall on server
- Use Cloudflare proxy for DDoS protection
- Keep Docker and system updated

## Support

For detailed instructions, see `DEPLOYMENT.md`
For quick reference, see `DEPLOY_QUICKSTART.md`

