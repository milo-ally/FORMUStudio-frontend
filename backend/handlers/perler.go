package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/formu/studio/db"
	"github.com/formu/studio/services"
)

type PerlerHandler struct {
	perlerService *services.PerlerService
}

func NewPerlerHandler(perlerService *services.PerlerService) *PerlerHandler {
	return &PerlerHandler{perlerService: perlerService}
}

func (h *PerlerHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	projectID := r.URL.Query().Get("projectId")
	if projectID == "" {
		http.Error(w, "projectId is required", http.StatusBadRequest)
		return
	}
	patterns, err := h.perlerService.ListByProject(projectID, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonResponse(w, patterns, http.StatusOK)
}

func (h *PerlerHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	id := r.PathValue("id")
	pattern, err := h.perlerService.GetByID(id, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonResponse(w, pattern, http.StatusOK)
}

func (h *PerlerHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	var p db.PerlerPattern
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	if p.ProjectID == "" {
		http.Error(w, "projectId is required", http.StatusBadRequest)
		return
	}
	pattern, err := h.perlerService.Create(&p, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonResponse(w, pattern, http.StatusCreated)
}

func (h *PerlerHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	id := r.PathValue("id")
	var p db.PerlerPattern
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	pattern, err := h.perlerService.Update(id, userID, &p)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonResponse(w, pattern, http.StatusOK)
}

func (h *PerlerHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	id := r.PathValue("id")
	if err := h.perlerService.Delete(id, userID); err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
