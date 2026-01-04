#!/bin/bash

# Database refresh script for CraftFlow (Docker version)
# This script refreshes the database in a Docker container
# Use this when running with docker compose

set -e  # Exit on error

# Configuration - Use environment variables or defaults
DB_NAME="${POSTGRES_DB:-craftflow_db}"
DB_USER="${POSTGRES_USER:-craftflow_user}"
CONTAINER_NAME="${POSTGRES_CONTAINER:-craftflow-postgres}"
SCHEMA_DIR="${SCHEMA_DIR:-db/schema}"
SEEDS_DIR="${SEEDS_DIR:-db/seeds}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker container exists
if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    print_error "PostgreSQL container '$CONTAINER_NAME' not found!"
    print_info "Make sure docker compose is running: docker compose up -d postgres"
    exit 1
fi

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    print_info "Starting container $CONTAINER_NAME..."
    docker start "$CONTAINER_NAME"
    sleep 2
fi

# Check if we're in the right directory
if [ ! -d "$SCHEMA_DIR" ]; then
    print_error "Schema directory not found: $SCHEMA_DIR"
    print_info "Please run this script from the project root directory"
    exit 1
fi

# Confirm destructive operation
print_warn "⚠️  WARNING: This will DROP and recreate the database: $DB_NAME"
print_warn "⚠️  All data will be permanently lost!"
print_warn "⚠️  Container: $CONTAINER_NAME"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation
if [ "$confirmation" != "yes" ]; then
    print_info "Operation cancelled."
    exit 0
fi

print_info "Starting database refresh for $DB_NAME in container $CONTAINER_NAME..."

# Step 1: Terminate all connections to the database
print_info "Terminating existing connections to $DB_NAME..."
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" 2>/dev/null || true

# Step 2: Drop the database
print_info "Dropping database $DB_NAME..."
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" || {
    print_error "Failed to drop database"
    exit 1
}

# Step 3: Create the database
print_info "Creating database $DB_NAME..."
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" || {
    print_error "Failed to create database"
    exit 1
}

# Step 4: Run schema files in order
print_info "Running schema files..."
for schema_file in "$SCHEMA_DIR"/[0-9][0-9]_*.sql; do
    if [ -f "$schema_file" ]; then
        filename=$(basename "$schema_file")
        print_info "  Running $filename..."
        docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" < "$schema_file" || {
            print_error "Failed to run $filename"
            exit 1
        }
    fi
done

# Step 5: Run seed data
if [ -f "$SEEDS_DIR/seed_data.sql" ]; then
    print_info "Running seed data..."
    docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" < "$SEEDS_DIR/seed_data.sql" || {
        print_error "Failed to run seed data"
        exit 1
    }
else
    print_warn "Seed data file not found: $SEEDS_DIR/seed_data.sql"
fi

print_info "Database refresh completed successfully! ✓"
print_info "Database $DB_NAME in container $CONTAINER_NAME is ready to use."

