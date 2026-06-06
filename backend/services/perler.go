package services

import "github.com/formu/studio/db"

type PerlerService struct {
	perlerRepo *db.PerlerPatternRepo
}

func NewPerlerService(perlerRepo *db.PerlerPatternRepo) *PerlerService {
	return &PerlerService{perlerRepo: perlerRepo}
}

func (s *PerlerService) ListByProject(projectID, userID string) ([]*db.PerlerPattern, error) {
	return s.perlerRepo.ListByProject(projectID, userID)
}

func (s *PerlerService) GetByID(id, userID string) (*db.PerlerPattern, error) {
	return s.perlerRepo.GetByID(id, userID)
}

func (s *PerlerService) Create(p *db.PerlerPattern, userID string) (*db.PerlerPattern, error) {
	p.UserID = userID
	return s.perlerRepo.Create(p)
}

func (s *PerlerService) Update(id, userID string, p *db.PerlerPattern) (*db.PerlerPattern, error) {
	return s.perlerRepo.Update(id, userID, p)
}

func (s *PerlerService) Delete(id, userID string) error {
	return s.perlerRepo.Delete(id, userID)
}
