-- 1. Create the new database
SELECT 'CREATE DATABASE course_management' 
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'course_management')\gexec

-- 2. Connect to the new database
\c course_management

-- 3. Create the schema
CREATE SCHEMA IF NOT EXISTS student;

-- 4. Create Tables
CREATE TABLE IF NOT EXISTS student.students (
    student_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student.modules (
    module_id INT PRIMARY KEY,
    track VARCHAR(50),
    topic_name VARCHAR(100) NOT NULL,
    -- Added metadata columns to support the Pathway.jsx layout
    column_index INT DEFAULT 0,
    row_index INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS student.student_scores (
    score_id SERIAL PRIMARY KEY,
    student_id INT REFERENCES student.students(student_id) ON DELETE CASCADE,
    module_id INT REFERENCES student.modules(module_id) ON DELETE CASCADE,
    score_value INT CHECK (score_value >= 0 AND score_value <= 10),
    test_date DATE DEFAULT CURRENT_DATE,
    -- Crucial: Ensures a student can't have two scores for the same module
    CONSTRAINT unique_student_module_score UNIQUE (student_id, module_id)
);

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_scores_student_id ON student.student_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_modules_track ON student.modules(track);

-- 6. Updated View
-- Expanded to include student names and calculated progress percentages
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
        WHEN ss.score_value = 10 THEN 'Excellence'
        WHEN ss.score_value >= 8 THEN 'Good'
        WHEN ss.score_value >= 5 THEN 'Average'
        WHEN ss.score_value IS NULL THEN 'Not Started'
        ELSE 'Fail'
    END AS grade_label,
    -- Calculate weight (normalized score out of 1.0) for the UI charts
    ROUND(COALESCE(ss.score_value, 0) / 10.0, 2) AS performance_weight
FROM student.modules m
LEFT JOIN student.student_scores ss ON m.module_id = ss.module_id
LEFT JOIN student.students s ON ss.student_id = s.student_id;