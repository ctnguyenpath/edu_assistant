-- ==============================================================================
-- FILE: 01b_course_relationships.sql
-- PURPOSE: Establish flexible one-to-many module connections and prerequisites.
-- ==============================================================================

BEGIN;

-- 1. Ensure both schemas exist before we try to build in them
CREATE SCHEMA IF NOT EXISTS courses;
CREATE SCHEMA IF NOT EXISTS student;

-- ------------------------------------------------------------------------------
-- 2. THE COURSES SCHEMA: Fixed prerequisites defined by curriculum creators
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses.module_prerequisites (
    module_id INT NOT NULL,              -- The module being unlocked
    required_module_id INT NOT NULL,     -- The module that MUST be completed first
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (module_id, required_module_id),
    
    -- Cascades ensure that if a module is deleted, its prerequisite rules are too
    -- FIXED: Referencing 'module_id' to match the courses.modules primary key
    FOREIGN KEY (module_id) REFERENCES courses.modules(module_id) ON DELETE CASCADE,
    FOREIGN KEY (required_module_id) REFERENCES courses.modules(module_id) ON DELETE CASCADE
);

-- Index for fast prerequisite lookups when rendering the UI locks
CREATE INDEX IF NOT EXISTS idx_courses_prereq ON courses.module_prerequisites(module_id);

-- ------------------------------------------------------------------------------
-- 3. THE STUDENT SCHEMA: The custom map built by the user
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student.user_path_connections (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL,             -- Connects to your user auth system
    source_module_id INT NOT NULL,       -- Where the connection line starts
    target_module_id INT NOT NULL,       -- Where the connection line ends
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure a student cannot draw the exact same duplicate line twice
    UNIQUE (student_id, source_module_id, target_module_id),
    
    -- Links the path back to the specific student
    FOREIGN KEY (student_id) REFERENCES student.students(student_id) ON DELETE CASCADE,

    -- Cross-Schema Foreign Keys linking back to the curriculum
    -- FIXED: Referencing 'module_id' to match the courses.modules primary key
    FOREIGN KEY (source_module_id) REFERENCES courses.modules(module_id) ON DELETE CASCADE,
    FOREIGN KEY (target_module_id) REFERENCES courses.modules(module_id) ON DELETE CASCADE
);

-- Index for quickly loading a specific student's entire custom map on login
CREATE INDEX IF NOT EXISTS idx_student_path ON student.user_path_connections(student_id);

COMMIT;