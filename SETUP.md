# DevSecOps Platform Setup Guide

This guide will help you set up and run the complete DevSecOps Platform locally or in production.

## 📋 Prerequisites

### Required Software
- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **PostgreSQL** (v12 or higher) - [Download](https://www.postgresql.org/download/)
- **Python** (v3.8 or higher) - [Download](https://www.python.org/downloads/)
- **Git** - [Download](https://git-scm.com/downloads)

### Optional (for containerized deployment)
- **Docker** - [Download](https://www.docker.com/get-started)
- **Docker Compose** - Usually included with Docker Desktop

## 🚀 Quick Start (Docker - Recommended)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd devsecops-platform
```

### 2. Environment Configuration
```bash
# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit the .env files with your configurations
# The default values should work for local development
```

### 3. Start with Docker Compose
```bash
# Install root dependencies (for convenience scripts)
npm install

# Start all services
docker-compose up -d

# Check service status
docker-compose ps
```

### 4. Initialize Database
```bash
# The database will be automatically initialized with the init.sql script
# Seed data will be loaded automatically on first run
```

### 5. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **AI Module**: http://localhost:5001
- **Database**: localhost:5432

### 6. Login with Demo Credentials
- **Admin**: admin@devsecops.com / admin123
- **Developer**: dev@devsecops.com / dev123

## 🛠️ Manual Setup (Development)

### 1. Database Setup
```bash
# Create PostgreSQL database
createdb devsecops_platform

# Or using psql
psql -U postgres
CREATE DATABASE devsecops_platform;
\q
```

### 2. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations and seed data
npm run migrate
npm run seed

# Start development server
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env if needed (default should work)

# Start development server
npm start
```

### 4. AI Module Setup
```bash
cd ai-module

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start AI module
python app.py
```

## 🔧 Configuration

### Backend Configuration (.env)
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/devsecops_platform

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Server
PORT=5000
NODE_ENV=development

# GitHub Integration (optional)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Security Tools (optional)
SNYK_TOKEN=your-snyk-api-token
OWASP_ZAP_URL=http://localhost:8080

# AI Module
AI_MODULE_URL=http://localhost:5001
```

### Frontend Configuration (.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_GITHUB_CLIENT_ID=your-github-client-id
REACT_APP_SOCKET_URL=http://localhost:5000
```

### AI Module Configuration
The AI module uses the same DATABASE_URL as the backend for data access.

## 🧪 Testing the Setup

### 1. Health Check Endpoints
```bash
# Backend health
curl http://localhost:5000/api/health

# AI module health
curl http://localhost:5001/health
```

### 2. Login Test
1. Open http://localhost:3000
2. Click "Login"
3. Use demo credentials: dev@devsecops.com / dev123
4. You should be redirected to the dashboard

### 3. Upload Test Project
1. Go to Dashboard → Upload Project
2. Create a simple zip file with some code
3. Upload and configure security scanning
4. Run a security scan to test the pipeline

## 📊 Features to Test

### Core Features
- [x] User registration and authentication
- [x] Project upload and GitHub integration
- [x] Security pipeline configuration
- [x] Vulnerability scanning (SAST, DAST, Dependency)
- [x] AI-powered threat prediction
- [x] Real-time monitoring and alerts
- [x] Automated mitigation actions
- [x] Admin dashboard and user management

### Security Tools Integration
- [x] Static Application Security Testing (SAST)
- [x] Dynamic Application Security Testing (DAST)
- [x] Dependency vulnerability scanning
- [x] Container security scanning
- [x] Infrastructure security checks

### AI/ML Features
- [x] Threat prediction based on project data
- [x] Anomaly detection in system metrics
- [x] Vulnerability risk assessment
- [x] Automated mitigation recommendations

## 🔍 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Check database exists
psql -U postgres -l | grep devsecops_platform
```

#### Port Conflicts
```bash
# Check what's running on ports
netstat -tulpn | grep :3000
netstat -tulpn | grep :5000
netstat -tulpn | grep :5001
```

#### Docker Issues
```bash
# Check Docker status
docker --version
docker-compose --version

# View logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs ai-module

# Restart services
docker-compose restart
```

#### Node.js Issues
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Python Issues
```bash
# Check Python version
python --version

# Reinstall dependencies
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

### Log Locations
- **Backend logs**: `backend/logs/`
- **Docker logs**: `docker-compose logs [service-name]`
- **Browser console**: F12 → Console tab

## 🚀 Production Deployment

### Environment Variables
Ensure all production environment variables are set:
- Strong JWT secrets
- Production database credentials
- HTTPS URLs
- Security tool API keys

### Security Considerations
- Use HTTPS in production
- Set up proper firewall rules
- Configure rate limiting
- Enable audit logging
- Use environment-specific secrets

### Scaling
- Use load balancers for frontend and backend
- Set up database replication
- Configure Redis for session management
- Use container orchestration (Kubernetes)

## 📚 Additional Resources

### API Documentation
- Backend API: http://localhost:5000/api/docs (when implemented)
- AI Module API: http://localhost:5001/docs (when implemented)

### Development Tools
- Database GUI: pgAdmin, DBeaver
- API Testing: Postman, Insomnia
- Log Monitoring: ELK Stack, Grafana

### Security Tools Integration
- OWASP ZAP: https://www.zaproxy.org/
- Snyk: https://snyk.io/
- SonarQube: https://www.sonarqube.org/

## 🆘 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the logs for error messages
3. Ensure all prerequisites are installed
4. Verify environment configuration
5. Check network connectivity and ports

For development questions, refer to the code documentation and comments in the source files.