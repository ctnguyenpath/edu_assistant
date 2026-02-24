-- Connect to the database
\c course_management

-- Insert Students
-- We use a CTE or Subquery later to ensure we don't guess the Serial ID
INSERT INTO student.students (full_name, email) 
VALUES 
    ('Main Student', 'student@example.com'),
    ('Jane Doe', 'jane.doe@example.com')
ON CONFLICT (email) DO NOTHING;

-- Insert Modules
-- Added row/col logic hints in comments if you plan to sync these with the React UI
INSERT INTO student.modules (module_id, track, topic_name) VALUES 
(1, 'Foundation', 'Python Basics'),
(2, 'Foundation', 'SQL Fundamentals'),
(3, 'Foundation', 'Statistics 101'),
(4, 'Data Engineering', 'ETL Pipeline Design'),
(5, 'Data Engineering', 'Distributed Computing (Spark)'),
(6, 'Data Analysis', 'Data Visualization (Tableau)'),
(7, 'Data Analysis', 'Exploratory Data Analysis (EDA)'),
(8, 'Advanced', 'Machine Learning Models')
ON CONFLICT (module_id) DO NOTHING;

-- Insert Scores for 'Main Student'
-- Using a subquery to find the student_id by email is much safer than hardcoding '1'
INSERT INTO student.student_scores (student_id, module_id, score_value) 
SELECT s.student_id, m.module_id, v.score
FROM student.students s
CROSS JOIN (VALUES 
    (1, 10), (2, 9), (3, 8), (4, 6), (5, 3), (6, 9), (7, 7), (8, 4)
) AS v(module_id, score)
JOIN student.modules m ON m.module_id = v.module_id
WHERE s.email = 'student@example.com'
ON CONFLICT (student_id, module_id) DO UPDATE 
SET score_value = EXCLUDED.score_value;

-- Insert varied scores for the second student
INSERT INTO student.student_scores (student_id, module_id, score_value) 
SELECT s.student_id, m.module_id, v.score
FROM student.students s
CROSS JOIN (VALUES 
    (1, 8), (2, 7), (3, 9), (6, 10), (7, 9)
) AS v(module_id, score)
JOIN student.modules m ON m.module_id = v.module_id
WHERE s.email = 'jane.doe@example.com'
ON CONFLICT (student_id, module_id) DO UPDATE 
SET score_value = EXCLUDED.score_value;