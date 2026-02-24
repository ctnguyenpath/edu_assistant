-- ============================================================
-- 1. DATABASE CREATION
-- Run against the default maintenance DB (postgres)
-- ============================================================

-- Safely create databases if they don't exist
SELECT 'CREATE DATABASE app_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'app_db')\gexec
SELECT 'CREATE DATABASE dataops' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'dataops')\gexec
SELECT 'CREATE DATABASE mhdm' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'mhdm')\gexec
SELECT 'CREATE DATABASE opsrisk' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'opsrisk')\gexec

-- Grant generic database privileges
GRANT ALL PRIVILEGES ON DATABASE app_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE dataops TO postgres;
GRANT ALL PRIVILEGES ON DATABASE mhdm TO postgres;
GRANT ALL PRIVILEGES ON DATABASE opsrisk TO postgres;

-- ============================================================
-- 2. APP_DB SETUP
-- Switch connection to 'app_db' to create tables inside it
-- ============================================================
\c app_db

-- Create the schema
CREATE SCHEMA IF NOT EXISTS user_management;

-- Reset table (Optional: good for fresh builds)
DROP TABLE IF EXISTS user_management.users;

-- Create the Users table
CREATE TABLE user_management.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(100),
    department VARCHAR(100),
    access_rights TEXT, -- ✅ Stores allowed functions (e.g. JSON or CSV string)
    password_hash VARCHAR(255) NOT NULL,
    parlant_session_id VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Grant privileges for the specific schema and tables
GRANT ALL PRIVILEGES ON SCHEMA user_management TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA user_management TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA user_management TO postgres;