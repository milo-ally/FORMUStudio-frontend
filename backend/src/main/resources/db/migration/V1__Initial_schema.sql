-- Users table
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'USER',
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- Projects table
CREATE TABLE projects (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    thumbnail_base64 TEXT DEFAULT '',
    image_count INTEGER DEFAULT 0,
    created_at BIGINT NOT NULL
);

-- Works table
CREATE TABLE works (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    image_base64 TEXT DEFAULT '',
    revised_prompt TEXT DEFAULT '',
    created_at BIGINT NOT NULL
);

-- Presets table
CREATE TABLE presets (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    prompt TEXT NOT NULL,
    image_base64 TEXT DEFAULT '',
    ratio VARCHAR(50) DEFAULT '1:1',
    is_custom BOOLEAN DEFAULT FALSE,
    created_at BIGINT NOT NULL
);

-- Prompt history table
CREATE TABLE prompt_history (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'image',
    count INTEGER DEFAULT 1,
    last_used BIGINT NOT NULL,
    UNIQUE(user_id, prompt, category)
);

-- Perler patterns table
CREATE TABLE perler_patterns (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT '',
    image_base64 TEXT DEFAULT '',
    grid_json TEXT NOT NULL DEFAULT '[]',
    grid_n INTEGER NOT NULL DEFAULT 50,
    grid_m INTEGER NOT NULL DEFAULT 50,
    pixelation_mode VARCHAR(50) NOT NULL DEFAULT 'dominant',
    color_system VARCHAR(50) NOT NULL DEFAULT 'MARD',
    bead_count INTEGER DEFAULT 0,
    color_counts_json TEXT DEFAULT '{}',
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- Settings table
CREATE TABLE settings (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    UNIQUE(user_id, key)
);

-- Indexes
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_works_user ON works(user_id);
CREATE INDEX idx_works_project ON works(project_id);
CREATE INDEX idx_presets_user ON presets(user_id);
CREATE INDEX idx_presets_custom ON presets(is_custom);
CREATE INDEX idx_perler_patterns_user ON perler_patterns(user_id);
CREATE INDEX idx_perler_patterns_project ON perler_patterns(project_id);
CREATE INDEX idx_prompt_history_user ON prompt_history(user_id);
CREATE INDEX idx_settings_user ON settings(user_id);
