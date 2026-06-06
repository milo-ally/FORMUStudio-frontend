package db

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
)

type UserRepo struct {
	db *sql.DB
}

func NewUserRepo(db *sql.DB) *UserRepo {
	return &UserRepo{db: db}
}

func (r *UserRepo) Create(email, passwordHash, name string) (*User, error) {
	id := uuid.NewString()
	now := time.Now()
	_, err := r.db.Exec(`
		INSERT INTO users (id, email, password_hash, name, role, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, 'USER', 'ACTIVE', ?, ?)
	`, id, email, passwordHash, name, now.Unix(), now.Unix())
	if err != nil {
		return nil, err
	}
	return r.GetByID(id)
}

func (r *UserRepo) GetByEmail(email string) (*User, error) {
	var u User
	var createdAt, updatedAt int64
	err := r.db.QueryRow(`
		SELECT id, email, password_hash, name, role, status, created_at, updated_at
		FROM users WHERE email = ?
	`, email).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.Role, &u.Status, &createdAt, &updatedAt)
	if err != nil {
		return nil, err
	}
	u.CreatedAt = time.Unix(createdAt, 0)
	u.UpdatedAt = time.Unix(updatedAt, 0)
	return &u, nil
}

func (r *UserRepo) GetByID(id string) (*User, error) {
	var u User
	var createdAt, updatedAt int64
	err := r.db.QueryRow(`
		SELECT id, email, password_hash, name, role, status, created_at, updated_at
		FROM users WHERE id = ?
	`, id).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.Role, &u.Status, &createdAt, &updatedAt)
	if err != nil {
		return nil, err
	}
	u.CreatedAt = time.Unix(createdAt, 0)
	u.UpdatedAt = time.Unix(updatedAt, 0)
	return &u, nil
}

func (r *UserRepo) ExistsByEmail(email string) (bool, error) {
	var count int
	err := r.db.QueryRow("SELECT COUNT(*) FROM users WHERE email = ?", email).Scan(&count)
	return count > 0, err
}

type ProjectRepo struct {
	db *sql.DB
}

func NewProjectRepo(db *sql.DB) *ProjectRepo {
	return &ProjectRepo{db: db}
}

func (r *ProjectRepo) ListByUser(userID string) ([]*Project, error) {
	rows, err := r.db.Query(`
		SELECT id, user_id, name, thumbnail_base64, image_count, created_at
		FROM projects WHERE user_id = ? ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []*Project
	for rows.Next() {
		var p Project
		var createdAt int64
		if err := rows.Scan(&p.ID, &p.UserID, &p.Name, &p.ThumbnailBase64, &p.ImageCount, &createdAt); err != nil {
			return nil, err
		}
		p.CreatedAt = time.Unix(createdAt, 0)
		projects = append(projects, &p)
	}
	return projects, nil
}

func (r *ProjectRepo) GetByID(id, userID string) (*Project, error) {
	var p Project
	var createdAt int64
	err := r.db.QueryRow(`
		SELECT id, user_id, name, thumbnail_base64, image_count, created_at
		FROM projects WHERE id = ? AND user_id = ?
	`, id, userID).Scan(&p.ID, &p.UserID, &p.Name, &p.ThumbnailBase64, &p.ImageCount, &createdAt)
	if err != nil {
		return nil, err
	}
	p.CreatedAt = time.Unix(createdAt, 0)
	return &p, nil
}

func (r *ProjectRepo) Create(name, userID string) (*Project, error) {
	id := uuid.NewString()
	now := time.Now()
	_, err := r.db.Exec(`
		INSERT INTO projects (id, user_id, name, thumbnail_base64, image_count, created_at)
		VALUES (?, ?, ?, '', 0, ?)
	`, id, userID, name, now.Unix())
	if err != nil {
		return nil, err
	}
	return r.GetByID(id, userID)
}

func (r *ProjectRepo) Update(id, name, userID string) (*Project, error) {
	_, err := r.db.Exec(`
		UPDATE projects SET name = ? WHERE id = ? AND user_id = ?
	`, name, id, userID)
	if err != nil {
		return nil, err
	}
	return r.GetByID(id, userID)
}

func (r *ProjectRepo) Delete(id, userID string) error {
	_, err := r.db.Exec("DELETE FROM projects WHERE id = ? AND user_id = ?", id, userID)
	return err
}

func (r *ProjectRepo) UpdateImageCount(projectID string, delta int) error {
	_, err := r.db.Exec(`
		UPDATE projects SET image_count = MAX(0, image_count + ?) WHERE id = ?
	`, delta, projectID)
	return err
}

type WorkRepo struct {
	db *sql.DB
}

func NewWorkRepo(db *sql.DB) *WorkRepo {
	return &WorkRepo{db: db}
}

func (r *WorkRepo) ListByProject(projectID, userID string) ([]*Work, error) {
	rows, err := r.db.Query(`
		SELECT id, user_id, project_id, image_base64, revised_prompt, created_at
		FROM works WHERE project_id = ? AND user_id = ? ORDER BY created_at DESC
	`, projectID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var works []*Work
	for rows.Next() {
		var w Work
		var createdAt int64
		if err := rows.Scan(&w.ID, &w.UserID, &w.ProjectID, &w.ImageBase64, &w.RevisedPrompt, &createdAt); err != nil {
			return nil, err
		}
		w.CreatedAt = time.Unix(createdAt, 0)
		works = append(works, &w)
	}
	return works, nil
}

func (r *WorkRepo) Create(projectID, userID, imageBase64, revisedPrompt string) (*Work, error) {
	id := uuid.NewString()
	now := time.Now()
	_, err := r.db.Exec(`
		INSERT INTO works (id, user_id, project_id, image_base64, revised_prompt, created_at)
		VALUES (?, ?, ?, ?, ?, ?)
	`, id, userID, projectID, imageBase64, revisedPrompt, now.Unix())
	if err != nil {
		return nil, err
	}
	return r.GetByID(id, userID)
}

func (r *WorkRepo) GetByID(id, userID string) (*Work, error) {
	var w Work
	var createdAt int64
	err := r.db.QueryRow(`
		SELECT id, user_id, project_id, image_base64, revised_prompt, created_at
		FROM works WHERE id = ? AND user_id = ?
	`, id, userID).Scan(&w.ID, &w.UserID, &w.ProjectID, &w.ImageBase64, &w.RevisedPrompt, &createdAt)
	if err != nil {
		return nil, err
	}
	w.CreatedAt = time.Unix(createdAt, 0)
	return &w, nil
}

func (r *WorkRepo) Delete(id, userID string) (string, error) {
	var projectID string
	err := r.db.QueryRow("SELECT project_id FROM works WHERE id = ? AND user_id = ?", id, userID).Scan(&projectID)
	if err != nil {
		return "", err
	}
	_, err = r.db.Exec("DELETE FROM works WHERE id = ? AND user_id = ?", id, userID)
	return projectID, err
}

func (r *WorkRepo) DeleteByProject(projectID string) error {
	_, err := r.db.Exec("DELETE FROM works WHERE project_id = ?", projectID)
	return err
}

type PerlerPatternRepo struct {
	db *sql.DB
}

func NewPerlerPatternRepo(db *sql.DB) *PerlerPatternRepo {
	return &PerlerPatternRepo{db: db}
}

func (r *PerlerPatternRepo) ListByProject(projectID, userID string) ([]*PerlerPattern, error) {
	rows, err := r.db.Query(`
		SELECT id, user_id, project_id, name, image_base64, grid_json, grid_n, grid_m,
		       pixelation_mode, color_system, bead_count, color_counts_json, created_at, updated_at
		FROM perler_patterns WHERE project_id = ? AND user_id = ? ORDER BY updated_at DESC
	`, projectID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var patterns []*PerlerPattern
	for rows.Next() {
		var p PerlerPattern
		var createdAt, updatedAt int64
		if err := rows.Scan(&p.ID, &p.UserID, &p.ProjectID, &p.Name, &p.ImageBase64, &p.GridJSON,
			&p.GridN, &p.GridM, &p.PixelationMode, &p.ColorSystem, &p.BeadCount,
			&p.ColorCountsJSON, &createdAt, &updatedAt); err != nil {
			return nil, err
		}
		p.CreatedAt = time.Unix(createdAt, 0)
		p.UpdatedAt = time.Unix(updatedAt, 0)
		patterns = append(patterns, &p)
	}
	return patterns, nil
}

func (r *PerlerPatternRepo) GetByID(id, userID string) (*PerlerPattern, error) {
	var p PerlerPattern
	var createdAt, updatedAt int64
	err := r.db.QueryRow(`
		SELECT id, user_id, project_id, name, image_base64, grid_json, grid_n, grid_m,
		       pixelation_mode, color_system, bead_count, color_counts_json, created_at, updated_at
		FROM perler_patterns WHERE id = ? AND user_id = ?
	`, id, userID).Scan(&p.ID, &p.UserID, &p.ProjectID, &p.Name, &p.ImageBase64, &p.GridJSON,
		&p.GridN, &p.GridM, &p.PixelationMode, &p.ColorSystem, &p.BeadCount,
		&p.ColorCountsJSON, &createdAt, &updatedAt)
	if err != nil {
		return nil, err
	}
	p.CreatedAt = time.Unix(createdAt, 0)
	p.UpdatedAt = time.Unix(updatedAt, 0)
	return &p, nil
}

func (r *PerlerPatternRepo) Create(p *PerlerPattern) (*PerlerPattern, error) {
	id := uuid.NewString()
	now := time.Now()
	_, err := r.db.Exec(`
		INSERT INTO perler_patterns (id, user_id, project_id, name, image_base64, grid_json,
			grid_n, grid_m, pixelation_mode, color_system, bead_count, color_counts_json, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, id, p.UserID, p.ProjectID, p.Name, p.ImageBase64, p.GridJSON,
		p.GridN, p.GridM, p.PixelationMode, p.ColorSystem, p.BeadCount, p.ColorCountsJSON, now.Unix(), now.Unix())
	if err != nil {
		return nil, err
	}
	return r.GetByID(id, p.UserID)
}

func (r *PerlerPatternRepo) Update(id, userID string, p *PerlerPattern) (*PerlerPattern, error) {
	now := time.Now()
	_, err := r.db.Exec(`
		UPDATE perler_patterns SET name = ?, image_base64 = ?, grid_json = ?, grid_n = ?, grid_m = ?,
			pixelation_mode = ?, color_system = ?, bead_count = ?, color_counts_json = ?, updated_at = ?
		WHERE id = ? AND user_id = ?
	`, p.Name, p.ImageBase64, p.GridJSON, p.GridN, p.GridM,
		p.PixelationMode, p.ColorSystem, p.BeadCount, p.ColorCountsJSON, now.Unix(), id, userID)
	if err != nil {
		return nil, err
	}
	return r.GetByID(id, userID)
}

func (r *PerlerPatternRepo) Delete(id, userID string) error {
	_, err := r.db.Exec("DELETE FROM perler_patterns WHERE id = ? AND user_id = ?", id, userID)
	return err
}
