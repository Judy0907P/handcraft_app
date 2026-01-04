# CraftFlow Deployment Guide

This guide will help you deploy CraftFlow to a DigitalOcean droplet using Docker Compose, Caddy, MinIO, and Cloudflare.

## Prerequisites

- A DigitalOcean account
- A domain name configured with Cloudflare
- SSH access to your server
- Basic knowledge of command line and Docker

## Step 1: Set Up DigitalOcean Droplet

1. **Create a Droplet**
   - Go to DigitalOcean and create a new Droplet
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

## Step 2: Configure Cloudflare DNS

1. **Add DNS Records**
   - Log into Cloudflare dashboard
   - Go to your domain's DNS settings
   - Add an A record:
     - Name: `@` (or `yourdomain.com`)
     - Content: Your DigitalOcean droplet IP address
     - Proxy status: Proxied (orange cloud) - This enables Cloudflare's CDN and DDoS protection
     - TTL: Auto

   - Optionally add a CNAME for www:
     - Name: `www`
     - Content: `yourdomain.com`
     - Proxy status: Proxied
     - TTL: Auto

2. **Get Cloudflare API Token (Optional - for automatic SSL)**
   - Go to Cloudflare Dashboard → My Profile → API Tokens
   - Click "Create Token"
   - Use "Edit zone DNS" template
   - Select your zone
   - Create token and copy it (you'll need it later)

## Step 3: Deploy the Application

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
   cp .env.example .env
   nano .env  # or use your preferred editor
   ```

   Update the following values:
   ```env
   DOMAIN=yourdomain.com
   BASE_URL=https://yourdomain.com
   VITE_API_URL=/api
   POSTGRES_PASSWORD=<generate-a-strong-password>
   JWT_SECRET_KEY=<generate-with: openssl rand -hex 32>
   MINIO_ROOT_PASSWORD=<generate-a-strong-password>
   CLOUDFLARE_API_TOKEN=<your-cloudflare-api-token>
   ```

3. **Update Caddyfile with Your Domain**
   ```bash
   nano Caddyfile
   ```
   Replace `yourdomain.com` with your actual domain name.

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

## Step 4: Configure Caddy with Cloudflare DNS Challenge

If you want Caddy to automatically get SSL certificates via Cloudflare DNS challenge (recommended):

1. **Update Caddyfile** to use Cloudflare DNS challenge:
   ```caddy
   yourdomain.com {
       # Cloudflare DNS challenge for SSL
       tls {
           dns cloudflare {env.CLOUDFLARE_API_TOKEN}
       }

       # ... rest of config ...
   }
   ```

2. **Add CLOUDFLARE_API_TOKEN to .env**:
   ```env
   CLOUDFLARE_API_TOKEN=your_cloudflare_api_token_here
   ```

3. **Update docker-compose.yml** to pass the token to Caddy:
   ```yaml
   caddy:
     environment:
       CLOUDFLARE_API_TOKEN: ${CLOUDFLARE_API_TOKEN}
     # ... rest of config ...
   ```

Alternatively, if Cloudflare is proxying your domain (orange cloud), you can use HTTP challenge through Cloudflare, or let Cloudflare handle SSL termination.

**Option A: Cloudflare SSL (Easier)**
- Keep Cloudflare proxy enabled (orange cloud)
- Caddy can use HTTP challenge since Cloudflare will proxy the request
- Cloudflare will handle SSL termination

**Option B: Origin Certificates (Advanced)**
- Generate Cloudflare Origin Certificate
- Use it with Caddy for end-to-end encryption

## Step 5: Initialize Database

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

## Step 6: Access Your Application

1. **Frontend**: https://yourdomain.com
2. **API Docs**: https://yourdomain.com/api/docs
3. **MinIO Console**: http://your_server_ip:9001 (or set up a subdomain)
   - Default credentials are in your `.env` file

## Step 7: Security Hardening

1. **Firewall Configuration**
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

2. **Change Default Passwords**
   - Update MinIO root credentials in `.env`
   - Update PostgreSQL password in `.env`
   - Update JWT secret key in `.env`

3. **Restrict MinIO Console Access**
   - Don't expose MinIO console port (9001) publicly
   - Access it via SSH tunnel: `ssh -L 9001:localhost:9001 root@your_server_ip`
   - Or set up a separate subdomain with authentication

4. **Regular Backups**
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

## Step 8: Monitoring and Maintenance

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f caddy
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
docker-compose restart backend
docker-compose restart frontend
```

### Check Resource Usage
```bash
docker stats
```

## Troubleshooting

### Caddy SSL Certificate Issues
- Check Caddy logs: `docker-compose logs caddy`
- Verify DNS records point to your server
- Ensure port 80 and 443 are open
- Check Cloudflare proxy settings

### Database Connection Issues
- Verify database is healthy: `docker-compose ps postgres`
- Check connection string in `.env`
- Test connection: `docker-compose exec postgres psql -U craftflow_user -d craftflow_db`

### MinIO Access Issues
- Verify MinIO is running: `docker-compose ps minio`
- Check MinIO logs: `docker-compose logs minio`
- Verify bucket exists: Access MinIO console at http://your_server_ip:9001

### Frontend Not Loading
- Check frontend logs: `docker-compose logs frontend`
- Verify API_URL is correct in `.env`
- Check browser console for errors
- Verify Caddy is routing correctly

## Additional Resources

- [Caddy Documentation](https://caddyserver.com/docs/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [MinIO Documentation](https://min.io/docs/)
- [Cloudflare SSL Documentation](https://developers.cloudflare.com/ssl/)

## Support

For issues specific to this deployment, check:
1. Service logs: `docker-compose logs [service-name]`
2. Container status: `docker-compose ps`
3. Network connectivity: `docker-compose exec backend ping postgres`

