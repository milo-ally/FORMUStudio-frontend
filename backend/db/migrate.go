package db

import "database/sql"

func Migrate(db *sql.DB) error {
	_, err := db.Exec(`
	CREATE TABLE IF NOT EXISTS users (
		id VARCHAR(255) PRIMARY KEY,
		email VARCHAR(255) UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		name VARCHAR(255),
		role VARCHAR(50) DEFAULT 'USER',
		status VARCHAR(50) DEFAULT 'ACTIVE',
		created_at BIGINT NOT NULL,
		updated_at BIGINT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS projects (
		id VARCHAR(255) PRIMARY KEY,
		user_id VARCHAR(255) NOT NULL,
		name VARCHAR(255) NOT NULL,
		thumbnail_base64 TEXT DEFAULT '',
		image_count INTEGER DEFAULT 0,
		created_at BIGINT NOT NULL,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS works (
		id VARCHAR(255) PRIMARY KEY,
		user_id VARCHAR(255) NOT NULL,
		project_id VARCHAR(255) NOT NULL,
		image_base64 TEXT DEFAULT '',
		revised_prompt TEXT DEFAULT '',
		created_at BIGINT NOT NULL,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
	);

	CREATE TABLE IF NOT EXISTS perler_patterns (
		id VARCHAR(255) PRIMARY KEY,
		user_id VARCHAR(255) NOT NULL,
		project_id VARCHAR(255) NOT NULL,
		name VARCHAR(255) DEFAULT '',
		image_base64 TEXT DEFAULT '',
		grid_json TEXT NOT NULL DEFAULT '[]',
		grid_n INTEGER NOT NULL DEFAULT 50,
		grid_m INTEGER NOT NULL DEFAULT 50,
		pixelation_mode VARCHAR(50) NOT NULL DEFAULT 'dominant',
		color_system VARCHAR(50) NOT NULL DEFAULT 'MARD',
		bead_count INTEGER DEFAULT 0,
		color_counts_json TEXT DEFAULT '{}',
		created_at BIGINT NOT NULL,
		updated_at BIGINT NOT NULL,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
		FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
	);

	CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
	CREATE INDEX IF NOT EXISTS idx_works_user ON works(user_id);
	CREATE INDEX IF NOT EXISTS idx_works_project ON works(project_id);
	CREATE INDEX IF NOT EXISTS idx_perler_patterns_user ON perler_patterns(user_id);
	CREATE INDEX IF NOT EXISTS idx_perler_patterns_project ON perler_patterns(project_id);
	`)
	return err
}
