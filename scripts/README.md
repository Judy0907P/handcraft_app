# Database Management Scripts

This directory contains scripts for managing the CraftFlow database.

## Scripts

### `refresh_db.sh`
**Purpose**: Refresh/reset the database for **local development** (direct PostgreSQL connection)

**Usage**:
```bash
# From project root
./scripts/refresh_db.sh
```

**Environment Variables** (optional, with safe defaults):
- `POSTGRES_DB` - Database name (default: `craftflow_db`)
- `POSTGRES_USER` - Database user (default: current system user)
- `POSTGRES_HOST` - Database host (default: `localhost`)
- `POSTGRES_PORT` - Database port (default: `5432`)
- `SCHEMA_DIR` - Schema directory path (default: `db/schema`)
- `SEEDS_DIR` - Seeds directory path (default: `db/seeds`)

**What it does**:
1. Drops the existing database
2. Creates a new database
3. Runs all schema files in order (00_*.sql through 08_*.sql)
4. Runs seed data if available

**⚠️ Warning**: This script will **permanently delete all data** in the database!

---

### `refresh_db_docker.sh`
**Purpose**: Refresh/reset the database when running with **Docker Compose**

**Usage**:
```bash
# From project root
./scripts/refresh_db_docker.sh
```

**Prerequisites**:
- Docker Compose services must be running: `docker-compose up -d postgres`

**Environment Variables** (optional, with safe defaults):
- `POSTGRES_DB` - Database name (default: `craftflow_db`)
- `POSTGRES_USER` - Database user (default: `craftflow_user`)
- `POSTGRES_CONTAINER` - Container name (default: `craftflow-postgres`)
- `SCHEMA_DIR` - Schema directory path (default: `db/schema`)
- `SEEDS_DIR` - Seeds directory path (default: `db/seeds`)

**What it does**:
1. Checks if the PostgreSQL container is running
2. Drops the existing database inside the container
3. Creates a new database
4. Runs all schema files in order
5. Runs seed data if available

**⚠️ Warning**: This script will **permanently delete all data** in the database!

---

## Security Notes

✅ **Safe to commit to Git**: 
- No hardcoded credentials
- Uses environment variables with safe defaults
- Requires explicit confirmation before destructive operations

⚠️ **For Production**:
- These scripts are primarily for development
- Use with extreme caution in production
- Always backup your database before running refresh scripts
- Consider using migrations instead of full refresh in production

---

## When to Use

### Local Development
- Use `refresh_db.sh` when developing locally with a direct PostgreSQL connection
- Useful for testing schema changes
- Quick way to reset to a clean state

### Docker Development
- Use `refresh_db_docker.sh` when developing with Docker Compose
- Useful for testing in containerized environment
- Matches production-like setup

### Production
- **NOT recommended** for production use
- For production, use proper database migrations
- Create backups before any database operations
- Consider using `pg_dump` and `pg_restore` for safer operations

---

## Example Workflow

### Local Development
```bash
# Set up environment
export POSTGRES_DB=craftflow_db
export POSTGRES_USER=myuser

# Refresh database
./scripts/refresh_db.sh
```

### Docker Development
```bash
# Start services
docker-compose up -d postgres

# Wait for database to be ready
sleep 5

# Refresh database
./scripts/refresh_db_docker.sh
```

---

## Troubleshooting

**Error: "container not found"**
- Make sure Docker Compose is running: `docker-compose ps`
- Check container name: `docker ps -a`

**Error: "permission denied"**
- Make sure scripts are executable: `chmod +x scripts/*.sh`

**Error: "connection refused"**
- For local: Check if PostgreSQL is running
- For Docker: Check if container is healthy: `docker-compose ps postgres`

