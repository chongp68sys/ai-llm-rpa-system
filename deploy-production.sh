#!/bin/bash
set -e

echo "🚀 Deploying AI/LLM RPA System to Production..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 1. Check prerequisites
print_status "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required but not installed."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is required but not installed."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ Node.js/npm is required but not installed."
    exit 1
fi

print_success "All prerequisites met"

# 2. Install dependencies
print_status "Installing dependencies..."
npm install --production=false
print_success "Dependencies installed"

# 3. Build frontend
print_status "Building frontend..."
npm run build
print_success "Frontend built"

# 4. Start infrastructure
print_status "Starting Docker infrastructure (PostgreSQL + Redis)..."
docker-compose up -d postgres redis

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 10

# Check PostgreSQL health
until docker-compose exec postgres pg_isready -U paul -d ai_llm_rpa_system &>/dev/null; do
    echo "Waiting for PostgreSQL..."
    sleep 2
done
print_success "PostgreSQL is healthy"

# Check Redis health
until docker-compose exec redis redis-cli ping | grep -q PONG; do
    echo "Waiting for Redis..."
    sleep 2
done
print_success "Redis is healthy"

# 5. Test database connectivity
print_status "Testing database connectivity..."
npm run test:db
print_success "Database connection verified"

# 6. Test infrastructure
print_status "Testing infrastructure components..."
npm run test:infrastructure
print_success "Infrastructure tests passed"

# 7. Start production server
print_status "Starting production server..."
echo ""
echo "🎉 Production deployment completed successfully!"
echo ""
echo "📊 System Information:"
echo "   🌐 Frontend: http://localhost:5173 (run 'npm run dev' in another terminal)"
echo "   🔌 Backend API: http://localhost:3005"
echo "   🏥 Health Check: http://localhost:3005/api/health"
echo "   🔌 WebSocket: ws://localhost:3005/ws"
echo ""
echo "🔐 Authentication Endpoints:"
echo "   📝 Register: POST http://localhost:3005/api/auth/register"
echo "   🔑 Login: POST http://localhost:3005/api/auth/login"
echo ""
echo "🐳 Docker Services:"
echo "   📊 PostgreSQL: localhost:5432"
echo "   📊 Redis: localhost:6379"
echo ""
echo "▶️  To start the backend server, run:"
echo "   npm run server:enhanced"
echo ""
echo "▶️  To start full development mode (frontend + backend):"
echo "   npm run dev:all"
echo ""
echo "▶️  To view Docker logs:"
echo "   npm run docker:logs"
echo ""
echo "▶️  To stop all services:"
echo "   npm run docker:down"

print_success "Ready for production! 🚀"