package services

import "github.com/formu/studio/db"

type WorkService struct {
	workRepo    *db.WorkRepo
	projectRepo *db.ProjectRepo
}

func NewWorkService(workRepo *db.WorkRepo, projectRepo *db.ProjectRepo) *WorkService {
	return &WorkService{workRepo: workRepo, projectRepo: projectRepo}
}

type CreateWorkRequest struct {
	ProjectID     string `json:"projectId"`
	ImageBase64   string `json:"imageBase64"`
	RevisedPrompt string `json:"revisedPrompt"`
}

func (s *WorkService) ListByProject(projectID, userID string) ([]*db.Work, error) {
	return s.workRepo.ListByProject(projectID, userID)
}

func (s *WorkService) Create(req *CreateWorkRequest, userID string) (*db.Work, error) {
	work, err := s.workRepo.Create(req.ProjectID, userID, req.ImageBase64, req.RevisedPrompt)
	if err != nil {
		return nil, err
	}

	if err := s.projectRepo.UpdateImageCount(req.ProjectID, 1); err != nil {
		// 即使更新失败也不影响创建结果
		return work, nil
	}

	return work, nil
}

func (s *WorkService) Delete(id, userID string) error {
	projectID, err := s.workRepo.Delete(id, userID)
	if err != nil {
		return err
	}

	if projectID != "" {
		s.projectRepo.UpdateImageCount(projectID, -1)
	}

	return nil
}
