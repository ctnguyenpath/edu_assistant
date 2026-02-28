-- Connect to the database
\c course_management

-- ==============================================================================
-- 1. SEED STUDENTS (Student Schema)
-- ==============================================================================
INSERT INTO student.students (full_name, email) 
VALUES 
    ('Main Student', 'student@example.com'),
    ('Jane Doe', 'jane.doe@example.com')
ON CONFLICT (email) DO NOTHING;

-- ==============================================================================
-- 2. SEED MODULES (Courses Schema)
-- ==============================================================================
-- Changed from student.modules to courses.modules
INSERT INTO courses.modules (module_id, track, topic_name) VALUES 
(1, 'Foundation', 'Python Basics'),
(2, 'Foundation', 'SQL Fundamentals'),
(3, 'Foundation', 'Statistics 101'),
(4, 'Data Engineering', 'ETL Pipeline Design'),
(5, 'Data Engineering', 'Distributed Computing (Spark)'),
(6, 'Data Analysis', 'Data Visualization (Tableau)'),
(7, 'Data Analysis', 'Exploratory Data Analysis (EDA)'),
(8, 'Advanced', 'Machine Learning Models')
ON CONFLICT (module_id) DO NOTHING;

-- ==============================================================================
-- 3. SEED PREREQUISITES (Courses Schema)
-- ==============================================================================
-- These are the strict rules for the UI locks
INSERT INTO courses.module_prerequisites (module_id, required_module_id) VALUES 
(4, 1), -- ETL requires Python
(4, 2), -- ETL requires SQL
(5, 4), -- Spark requires ETL
(6, 2), -- Tableau requires SQL
(7, 1), -- EDA requires Python
(7, 3), -- EDA requires Statistics
(8, 7), -- ML requires EDA
(8, 1)  -- ML requires Python
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- 4. SEED SCORES (Student Schema)
-- ==============================================================================
-- Insert Scores for 'Main Student'
INSERT INTO student.student_scores (student_id, module_id, score_value) 
SELECT s.student_id, m.module_id, v.score
FROM student.students s
CROSS JOIN (VALUES 
    (1, 10), (2, 9), (3, 8), (4, 6), (5, 3), (6, 9), (7, 7), (8, 4)
) AS v(module_id, score)
JOIN courses.modules m ON m.module_id = v.module_id -- Updated JOIN
WHERE s.email = 'student@example.com'
ON CONFLICT (student_id, module_id) DO UPDATE 
SET score_value = EXCLUDED.score_value;

-- Insert varied scores for 'Jane Doe'
INSERT INTO student.student_scores (student_id, module_id, score_value) 
SELECT s.student_id, m.module_id, v.score
FROM student.students s
CROSS JOIN (VALUES 
    (1, 8), (2, 7), (3, 9), (6, 10), (7, 9)
) AS v(module_id, score)
JOIN courses.modules m ON m.module_id = v.module_id -- Updated JOIN
WHERE s.email = 'jane.doe@example.com'
ON CONFLICT (student_id, module_id) DO UPDATE 
SET score_value = EXCLUDED.score_value;

-- ==============================================================================
-- 5. SEED USER PATH CONNECTIONS (Student Schema)
-- ==============================================================================
-- Simulating the Directed Acyclic Graph (DAG) that 'Main Student' drew
INSERT INTO student.user_path_connections (student_id, source_module_id, target_module_id)
SELECT s.student_id, v.source, v.target
FROM student.students s
CROSS JOIN (VALUES 
    (1, 4), -- Python -> ETL
    (2, 4), -- SQL -> ETL
    (4, 5), -- ETL -> Spark
    (2, 6), -- SQL -> Tableau
    (1, 7), -- Python -> EDA
    (3, 7), -- Stats -> EDA
    (7, 8)  -- EDA -> ML
) AS v(source, target)
WHERE s.email = 'student@example.com'
ON CONFLICT DO NOTHING;