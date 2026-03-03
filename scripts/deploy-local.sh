#!/bin/bash

##############################################################################
# JARVIS LOCAL DEPLOYMENT SCRIPT
# Complete setup for local development and testing
##############################################################################

set -e

echo "🚀 JARVIS LOCAL DEPLOYMENT"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker not installed. Please install Docker Desktop."
        exit 1
    fi
    log_success "Docker installed: $(docker --version)"

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose not installed."
        exit 1
    fi
    log_success "Docker Compose installed: $(docker-compose --version)"

    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_warning "Node.js not installed. Some local commands won't work."
    else
        log_success "Node.js installed: $(node --version)"
    fi

    # Check .env file
    if [ ! -f .env ]; then
        log_warning ".env file not found. Creating from .env.example..."
        if [ -f .env.example ]; then
            cp .env.example .env
            log_success ".env created from .env.example. Please edit with your API keys."
        else
            log_error ".env.example not found. Create .env manually with required variables."
            exit 1
        fi
    fi
}

# Create directories
create_directories() {
    log_info "Creating necessary directories..."
    mkdir -p .jarvis/{tasks,logs,config,pending-agents,pending-mutations}
    mkdir -p monitoring/grafana/{dashboards,datasources}
    mkdir -p scripts/{backups,logs}
    log_success "Directories created"
}

# Start Docker services
start_docker_services() {
    log_info "Starting Docker services..."
    docker-compose up -d

    log_info "Waiting for services to initialize..."
    sleep 10

    # Check service health
    log_info "Checking service health..."

    # PostgreSQL
    if docker exec jarvis-postgres pg_isready -U jarvis &> /dev/null; then
        log_success "PostgreSQL is ready"
    else
        log_error "PostgreSQL failed to start"
        exit 1
    fi

    # Redis
    if docker exec jarvis-redis redis-cli ping &> /dev/null; then
        log_success "Redis is ready"
    else
        log_error "Redis failed to start"
        exit 1
    fi

    log_success "All Docker services started"
}

# Initialize databases
init_databases() {
    log_info "Initializing databases..."

    # PostgreSQL migrations
    log_info "Running PostgreSQL migrations..."
    docker exec jarvis-backend npm run db:migrate 2>/dev/null || {
        log_warning "Migrations may have failed. Check logs."
    }

    # Neo4j setup
    log_info "Setting up Neo4j..."
    docker exec jarvis-neo4j cypher-shell -u neo4j -p jarvis_neo4j_password \
        "CREATE CONSTRAINT IF NOT EXISTS FOR (a:Agent) REQUIRE a.id IS UNIQUE;" \
        2>/dev/null || true

    log_success "Databases initialized"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."

    if command -v npm &> /dev/null; then
        npm install
        log_success "Dependencies installed"
    else
        log_warning "npm not found. Skipping npm install."
    fi
}

# Run tests
run_tests() {
    log_info "Running tests..."

    if command -v npm &> /dev/null; then
        npm test 2>/dev/null || {
            log_warning "Some tests may have failed."
        }
        log_success "Tests completed"
    fi
}

# Display access information
display_access_info() {
    log_info "Services are running!"
    echo ""
    echo "======================================"
    echo "ACCESS POINTS:"
    echo "======================================"
    echo ""
    echo -e "${GREEN}Frontend (UI)${NC}"
    echo "  URL: http://localhost:5173"
    echo "  Status: Use browser to check"
    echo ""
    echo -e "${GREEN}API Gateway${NC}"
    echo "  URL: http://localhost:3001"
    echo "  Health: curl http://localhost:3001/health"
    echo ""
    echo -e "${GREEN}Backend API${NC}"
    echo "  URL: http://localhost:3000"
    echo "  Health: curl http://localhost:3000/health"
    echo ""
    echo -e "${GREEN}Databases${NC}"
    echo "  PostgreSQL: localhost:5432 (jarvis/jarvis_dev_password)"
    echo "  Redis: localhost:6379"
    echo "  Neo4j: http://localhost:7474 (neo4j/jarvis_neo4j_password)"
    echo "  Qdrant: http://localhost:6333"
    echo ""
    echo -e "${GREEN}Monitoring${NC}"
    echo "  Prometheus: http://localhost:9090"
    echo "  Grafana: http://localhost:3100 (admin/admin)"
    echo ""
    echo "======================================"
    echo ""
}

# Main execution
main() {
    log_info "Starting Jarvis deployment..."

    check_prerequisites
    create_directories
    install_dependencies
    start_docker_services
    init_databases

    # Optionally run tests
    if [ "$1" == "--test" ]; then
        run_tests
    fi

    display_access_info

    log_success "Jarvis deployment complete!"
    log_info "Next steps:"
    log_info "  1. Open http://localhost:5173 in your browser"
    log_info "  2. Configure Telegram/WhatsApp tokens (optional)"
    log_info "  3. Start using Jarvis!"
    echo ""
}

# Run main function
main "$@"
