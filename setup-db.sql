-- Setup script for AI LLM RPA System Database
-- Run this in PostgreSQL to create the database and user

-- Create database (run as superuser/postgres user)
CREATE DATABASE ai_llm_rpa_system
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1
    IS_TEMPLATE = False;

-- Optional: Create a dedicated user for the application
-- CREATE USER ai_rpa_user WITH ENCRYPTED PASSWORD 'your_secure_password';
-- GRANT ALL PRIVILEGES ON DATABASE ai_llm_rpa_system TO ai_rpa_user;

-- Connect to the new database
\c ai_llm_rpa_system;

-- Grant privileges to the user (if using dedicated user)
-- GRANT ALL ON SCHEMA public TO ai_rpa_user;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ai_rpa_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ai_rpa_user;

-- Verify database creation
SELECT current_database(), current_user, version();