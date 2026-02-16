#!/bin/bash

# DevSecOps Platform Installation Script
# This script sets up the complete DevSecOps platform

set -e

echo "🚀 DevSecOps Platform Installation"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    local missing_deps=()
    
    if ! command_exists node; then
        missing_deps+=("Node.js (v16+)")
    else
        NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -lt 16 ]; then
            missing_deps+=("Node.js v16+ (current: $(node --version))")
        fi
    fi
    
    if ! command_exists npm; then
        missing_deps+=("npm")
    fi
    
    if ! command_exists python3; then
        missing_deps+=("Python 3.8+")
    fi
    
    if ! command_exists psql; then
        missing_deps+=("PostgreSQL")
    fi
    
    if ! command_exists git; then
        missing_deps+=("Git")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing prerequisites:"
        for dep in "${missing_deps[@]}"; do
            echo "  - $dep"
        done
        echo ""
        echo "Please install the missing dependencies and run this script again."
        echo "Visit the README.md for installation instructions."
        exit 1
    fi
    
    print_success "All prerequisites are installed"
}

# Setup environment files
setup_environment() {
    print_status "Setting up environment files..."
    
    # Backend environment
    if [ ! -f "backend/.env" ]; then
        cp backend/.env.example backend/.env
        print_success "Created backend/.env from template"
        print_warning "Please edit backend/.env with your database credentials"
    else
        print_warning "backend/.env already exists, skipping..."
    fi
    
    # Frontend environment
    if [ ! -f "frontend/.env" ]; then
        cp frontend/.env.example frontend/.env
        print_success "Created frontend/.env from template"
    else
        print_warning "frontend/.env already exists, skipping..."
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Root dependencies
    print_status "Installing root dependencies..."
    npm install
    
    # Backend dependencies
    print_status "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    
    # Frontend dependencies
    print_status "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    
    # AI module dependencies
    print_status "Installing AI module dependencies..."
    cd ai-module
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        print_status "Creating Python virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment and install dependencies
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    deactivate
    cd ..
    
    print_success "All dependencies installed successfully"
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    # Check if PostgreSQL is running
    if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
        print_error "PostgreSQL is not running. Please start PostgreSQL and try again."
        return 1
    fi
    
    # Create database if it doesn't exist
    if ! psql -U postgres -lqt | cut -d \| -f 1 | grep -qw devsecops_platform; then
        print_status "Creating database..."
        createdb -U postgres devsecops_platform
        print_success "Database created"
    else
        print_warning "Database already exists, skipping creation..."
    fi
    
    # Run migrations and seed data
    print_status "Running database migrations and seeding data..."
    cd backend
    npm run migrate
    npm run seed
    cd ..
    
    print_success "Database setup completed"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p backend/uploads/projects
    mkdir -p backend/logs
    mkdir -p ai-module/models
    
    print_success "Directories created"
}

# Start services
start_services() {
    print_status "Starting services..."
    
    # Check if Docker is available
    if command_exists docker && command_exists docker-compose; then
        read -p "Do you want to start services with Docker? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_status "Starting services with Docker Compose..."
            docker-compose up -d
            print_success "Services started with Docker"
            return 0
        fi
    fi
    
    # Manual startup
    print_status "Starting services manually..."
    print_warning "You'll need to start each service in separate terminals:"
    echo ""
    echo "Terminal 1 - Backend:"
    echo "  cd backend && npm start"
    echo ""
    echo "Terminal 2 - Frontend:"
    echo "  cd frontend && npm start"
    echo ""
    echo "Terminal 3 - AI Module:"
    echo "  cd ai-module && source venv/bin/activate && python app.py"
    echo ""
}

# Verify installation
verify_installation() {
    print_status "Verifying installation..."
    
    # Check if services are running (Docker mode)
    if command_exists docker && docker-compose ps >/dev/null 2>&1; then
        print_status "Checking Docker services..."
        
        # Wait a bit for services to start
        sleep 10
        
        # Check backend health
        if curl -f http://localhost:5000/api/health >/dev/null 2>&1; then
            print_success "Backend service is running"
        else
            print_warning "Backend service may not be ready yet"
        fi
        
        # Check AI module health
        if curl -f http://localhost:5001/health >/dev/null 2>&1; then
            print_success "AI module is running"
        else
            print_warning "AI module may not be ready yet"
        fi
        
        # Check frontend
        if curl -f http://localhost:3000 >/dev/null 2>&1; then
            print_success "Frontend is running"
        else
            print_warning "Frontend may not be ready yet"
        fi
    fi
    
    print_success "Installation verification completed"
}

# Display final instructions
show_final_instructions() {
    echo ""
    echo "🎉 Installation Complete!"
    echo "========================"
    echo ""
    echo "Access your DevSecOps Platform:"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend API: http://localhost:5000"
    echo "  AI Module: http://localhost:5001"
    echo ""
    echo "Demo Login Credentials:"
    echo "  Admin: admin@devsecops.com / admin123"
    echo "  Developer: dev@devsecops.com / dev123"
    echo ""
    echo "Next Steps:"
    echo "1. Open http://localhost:3000 in your browser"
    echo "2. Login with demo credentials"
    echo "3. Upload a project or connect a GitHub repository"
    echo "4. Configure and run security scans"
    echo "5. Explore threat predictions and mitigation actions"
    echo ""
    echo "Documentation:"
    echo "  Setup Guide: SETUP.md"
    echo "  Architecture: ARCHITECTURE.md"
    echo "  README: README.md"
    echo ""
    echo "Troubleshooting:"
    echo "  Check logs: docker-compose logs [service-name]"
    echo "  Restart services: docker-compose restart"
    echo "  Stop services: docker-compose down"
    echo ""
}

# Main installation flow
main() {
    echo "Starting DevSecOps Platform installation..."
    echo ""
    
    check_prerequisites
    setup_environment
    create_directories
    install_dependencies
    
    # Ask about database setup
    read -p "Do you want to set up the database now? (requires PostgreSQL) (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_database
    else
        print_warning "Skipping database setup. You'll need to set it up manually later."
    fi
    
    start_services
    verify_installation
    show_final_instructions
    
    print_success "DevSecOps Platform installation completed successfully!"
}

# Run main function
main "$@"