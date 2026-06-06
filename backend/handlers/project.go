package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/formu/studio/services"
)

type ProjectHandler struct {
	projectService *services.ProjectService
}

func NewProjectHandler(projectService *services.ProjectService) *ProjectHandler {
	return &ProjectHandler{projectService: projectService}
}

func getUserID(r *http.Request) string {
	userID, _ := r.Context().Value("userID").(string)
	return userID
}

func (h *ProjectHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	projects, err := h.projectService.ListByUser(userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonResponse(w, projects, http.StatusOK)
}

func (h *ProjectHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	id := r.PathValue("id")
	project, err := h.projectService.GetByID(id, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonResponse(w, project, http.StatusOK)
}

type CreateProjectRequest struct {
	Name string `json:"name"`
}

func (h *ProjectHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	var req CreateProjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	if req.Name == "" {
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}
	project, err := h.projectService.Create(req.Name, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonResponse(w, project, http.StatusCreated)
}

func (h *ProjectHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	id := r.PathValue("id")
	var req CreateProjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	if req.Name == "" {
		http.Error(w, "Name is required", http.StatusBadRequest)
		return
	}
	project, err := h.projectService.Update(id, req.Name, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonResponse(w, project, http.StatusOK)
}

func (h *ProjectHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	id := r.PathValue("id")
	if err := h.projectService.Delete(id, userID); err != nil {
		if err.Error() == "project not found" {
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
