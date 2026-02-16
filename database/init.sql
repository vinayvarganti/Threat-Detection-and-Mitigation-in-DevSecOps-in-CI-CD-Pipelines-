-- Initialize DevSecOps Platform Database
-- This script sets up the initial database structure and configurations

-- Create database if it doesn't exist
-- Note: This is handled by Docker Compose environment variables

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'developer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE project_type AS ENUM ('upload', 'github');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE project_status AS ENUM ('active', 'inactive', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE pipeline_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE scan_type AS ENUM ('sast', 'dast', 'dependency', 'container', 'infrastructure');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE vulnerability_severity AS ENUM ('critical', 'high', 'medium', 'low', 'info');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE vulnerability_status AS ENUM ('open', 'in_progress', 'resolved', 'false_positive', 'accepted_risk');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create indexes for better performance (will be created by Sequelize, but good to have as reference)
-- These are examples of indexes that would be beneficial

-- User indexes
-- CREATE INDEX IF NOT EXISTS idx_users_email ON "Users" (email);
-- CREATE INDEX IF NOT EXISTS idx_users_username ON "Users" (username);
-- CREATE INDEX IF NOT EXISTS idx_users_role ON "Users" (role);

-- Project indexes
-- CREATE INDEX IF NOT EXISTS idx_projects_user_id ON "Projects" ("userId");
-- CREATE INDEX IF NOT EXISTS idx_projects_status ON "Projects" (status);
-- CREATE INDEX IF NOT EXISTS idx_projects_type ON "Projects" (type);

-- Pipeline indexes
-- CREATE INDEX IF NOT EXISTS idx_pipelines_project_id ON "Pipelines" ("projectId");
-- CREATE INDEX IF NOT EXISTS idx_pipelines_status ON "Pipelines" (status);

-- Vulnerability indexes
-- CREATE INDEX IF NOT EXISTS idx_vulnerabilities_severity ON "Vulnerabilities" (severity);
-- CREATE INDEX IF NOT EXISTS idx_vulnerabilities_status ON "Vulnerabilities" (status);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Grant permissions to the application user
-- Note: User is created by Docker Compose
GRANT ALL PRIVILEGES ON DATABASE devsecops_platform TO devsecops_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO devsecops_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO devsecops_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO devsecops_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO devsecops_user;