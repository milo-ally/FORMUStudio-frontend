package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/formu/studio/services"
)

type WorkHandler struct {
	workService *services.WorkService
}

func NewWorkHandler(workService *services.WorkService) *WorkHandler {
	return &WorkHandler{workService: workService}
}

func (h *WorkHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	projectID := r.URL.Query().Get("projectId")
	if projectID == "" {
		http.Error(w, "projectId is required", http.StatusBadRequest)
		return
	}
	works, err := h.workService.ListByProject(projectID, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonResponse(w, works, http.StatusOK)
}

func (h *WorkHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	var req services.CreateWorkRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	if req.ProjectID == "" {
		http.Error(w, "projectId is required", http.StatusBadRequest)
		return
	}
	work, err := h.workService.Create(&req, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonResponse(w, work, http.StatusCreated)
}

func (h *WorkHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	id := r.PathValue("id")
	if err := h.workService.Delete(id, userID); err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
