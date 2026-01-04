#!/bin/bash

# CraftFlow Deployment Script
# This script helps with common deployment tasks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 CraftFlow Deployment Helper${NC}\n"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from env.example...${NC}"
    cp env.example .env
    echo -e "${RED}⚠️  Please edit .env and update all configuration values before continuing!${NC}"
    echo -e "${YELLOW}   Press Enter when ready, or Ctrl+C to exit...${NC}"
    read
fi

# Check if Caddyfile has been updated with domain
if grep -q "yourdomain.com" Caddyfile; then
    echo -e "${YELLOW}⚠️  Caddyfile still contains 'yourdomain.com'${NC}"
    echo -e "${YELLOW}   Please update Caddyfile with your actual domain name!${NC}"
    echo -e "${YELLOW}   Press Enter to continue anyway, or Ctrl+C to exit...${NC}"
    read
fi

# Function to check service health
check_health() {
    echo -e "\n${GREEN}Checking service health...${NC}"
    docker-compose ps
    echo ""
    
    # Check if backend is healthy
    if docker-compose exec -T backend curl -f http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is healthy${NC}"
    else
        echo -e "${RED}✗ Backend health check failed${NC}"
    fi
}

# Main menu
case "${1:-}" in
    start)
        echo -e "${GREEN}Starting services...${NC}"
        docker-compose up -d
        echo -e "${GREEN}Waiting for services to start...${NC}"
        sleep 5
        check_health
        ;;
    stop)
        echo -e "${YELLOW}Stopping services...${NC}"
        docker-compose down
        ;;
    restart)
        echo -e "${YELLOW}Restarting services...${NC}"
        docker-compose restart
        sleep 5
        check_health
        ;;
    logs)
        service="${2:-}"
        if [ -z "$service" ]; then
            docker-compose logs -f
        else
            docker-compose logs -f "$service"
        fi
        ;;
    build)
        echo -e "${GREEN}Building services...${NC}"
        docker-compose build
        ;;
    rebuild)
        echo -e "${GREEN}Rebuilding services...${NC}"
        docker-compose down
        docker-compose build --no-cache
        docker-compose up -d
        sleep 5
        check_health
        ;;
    update)
        echo -e "${GREEN}Updating application...${NC}"
        if [ -d .git ]; then
            git pull
        fi
        docker-compose build
        docker-compose up -d
        sleep 5
        check_health
        ;;
    status)
        check_health
        ;;
    backup)
        echo -e "${GREEN}Creating database backup...${NC}"
        BACKUP_DIR="./backups"
        mkdir -p "$BACKUP_DIR"
        docker-compose exec -T postgres pg_dump -U craftflow_user craftflow_db > "$BACKUP_DIR/db_$(date +%Y%m%d_%H%M%S).sql"
        echo -e "${GREEN}✓ Backup saved to $BACKUP_DIR/${NC}"
        ;;
    shell)
        service="${2:-backend}"
        echo -e "${GREEN}Opening shell in $service...${NC}"
        docker-compose exec "$service" /bin/bash || docker-compose exec "$service" /bin/sh
        ;;
    db-refresh)
        echo -e "${YELLOW}⚠️  WARNING: This will delete all database data!${NC}"
        if [ -f "scripts/refresh_db_docker.sh" ]; then
            ./scripts/refresh_db_docker.sh
        else
            echo -e "${RED}Database refresh script not found!${NC}"
            exit 1
        fi
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|logs|build|rebuild|update|status|backup|shell|db-refresh}"
        echo ""
        echo "Commands:"
        echo "  start      - Start all services"
        echo "  stop       - Stop all services"
        echo "  restart    - Restart all services"
        echo "  logs       - Show logs (optionally specify service: logs backend)"
        echo "  build      - Build Docker images"
        echo "  rebuild    - Rebuild images from scratch"
        echo "  update     - Pull latest code and rebuild"
        echo "  status     - Check service health"
        echo "  backup     - Create database backup"
        echo "  shell      - Open shell in service (default: backend)"
        echo "  db-refresh - Refresh database (⚠️  WARNING: Deletes all data!)"
        exit 1
        ;;
esac

