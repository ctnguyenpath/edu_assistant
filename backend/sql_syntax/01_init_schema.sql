-- 01_init_schema.sql
-- 1. Create the new database
SELECT 'CREATE DATABASE course_management' 
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'course_management')\gexec

-- 2. Connect to the new database
\c course_management

-- 3. Create the schemas (Separation of Concerns)
CREATE SCHEMA IF NOT EXISTS courses;
CREATE SCHEMA IF NOT EXISTS student;

-- ==============================================================================
-- 4A. MASTER BLUEPRINT (Courses Schema)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS courses.modules (
    module_id INT PRIMARY KEY,
    track VARCHAR(50),
    topic_name VARCHAR(100) NOT NULL,
    -- Added metadata columns to support the Pathway.jsx layout
    column_index INT DEFAULT 0,
    row_index INT DEFAULT 0
);

-- Prerequisite mapping table (referenced in 02_seed_data.sql)
CREATE TABLE IF NOT EXISTS courses.module_prerequisites (
    module_id INT REFERENCES courses.modules(module_id) ON DELETE CASCADE,
    required_module_id INT REFERENCES courses.modules(module_id) ON DELETE CASCADE,
    PRIMARY KEY (module_id, required_module_id)
);

-- ==============================================================================
-- 4B. USER JOURNEY (Student Schema)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS student.students (
    student_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- ADDED: Password field for login
    parlant_session_id VARCHAR(255), -- ADDED: To store AI chatbot session state
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student.student_scores (
    score_id SERIAL PRIMARY KEY,
    student_id INT REFERENCES student.students(student_id) ON DELETE CASCADE,
    -- Cross-Schema Foreign Key mapping to the curriculum
    module_id INT REFERENCES courses.modules(module_id) ON DELETE CASCADE,
    score_value INT CHECK (score_value >= 0 AND score_value <= 100), -- Updated constraint to 100 based on UI
    test_date DATE DEFAULT CURRENT_DATE,
    -- Crucial: Ensures a student can't have two scores for the same module
    CONSTRAINT unique_student_module_score UNIQUE (student_id, module_id)
);

-- User Pathway connections drawn on the map (referenced in 02_seed_data.sql)
CREATE TABLE IF NOT EXISTS student.user_path_connections (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES student.students(student_id) ON DELETE CASCADE,
    source_module_id INT, -- Can be 'START' conceptually, but INT implies module IDs. Use 0 for START if needed.
    target_module_id INT REFERENCES courses.modules(module_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_student_path_connection UNIQUE (student_id, source_module_id, target_module_id)
);

-- ==============================================================================
-- 5. PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_scores_student_id ON student.student_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_modules_track ON courses.modules(track);
CREATE INDEX IF NOT EXISTS idx_user_paths_student_id ON student.user_path_connections(student_id);

-- ==============================================================================
-- 6. PERFORMANCE VIEW
-- ==============================================================================
-- Expanded to include student names and calculated progress percentages.
-- Joins data seamlessly across the 'courses' and 'student' schemas.
CREATE OR REPLACE VIEW student.module_performance AS
SELECT 
    m.module_id,
    m.topic_name,
    m.track,
    m.column_index,
    m.row_index,
    s.student_id,
    s.full_name AS student_name,
    ss.score_value,
    ss.test_date,
    CASE 
        WHEN ss.score_value >= 90 THEN 'Excellence' -- Scaled to 100
        WHEN ss.score_value >= 75 THEN 'Good'
        WHEN ss.score_value >= 50 THEN 'Average'
        WHEN ss.score_value IS NULL THEN 'Not Started'
        ELSE 'Fail'
    END AS grade_label,
    -- Calculate weight (normalized score out of 1.0) for the UI charts
    ROUND(COALESCE(ss.score_value, 0) / 100.0, 2) AS performance_weight -- Scaled to 100
FROM courses.modules m
LEFT JOIN student.student_scores ss ON m.module_id = ss.module_id
LEFT JOIN student.students s ON ss.student_id = s.student_id;