package services

import (
	"database/sql"
	"errors"

	"github.com/formu/studio/db"
)

type ProjectService struct {
	projectRepo *db.ProjectRepo
	workRepo    *db.WorkRepo
	db          *sql.DB
}

func NewProjectService(projectRepo *db.ProjectRepo, workRepo *db.WorkRepo) *ProjectService {
	return &ProjectService{projectRepo: projectRepo, workRepo: workRepo}
}

func (s *ProjectService) ListByUser(userID string) ([]*db.Project, error) {
	return s.projectRepo.ListByUser(userID)
}

func (s *ProjectService) GetByID(id, userID string) (*db.Project, error) {
	return s.projectRepo.GetByID(id, userID)
}

func (s *ProjectService) Create(name, userID string) (*db.Project, error) {
	return s.projectRepo.Create(name, userID)
}

func (s *ProjectService) Update(id, name, userID string) (*db.Project, error) {
	return s.projectRepo.Update(id, name, userID)
}

func (s *ProjectService) Delete(id, userID string) error {
	_, err := s.projectRepo.GetByID(id, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return errors.New("project not found")
		}
		return err
	}

	if err := s.workRepo.DeleteByProject(id); err != nil {
		return err
	}

	return s.projectRepo.Delete(id, userID)
}
