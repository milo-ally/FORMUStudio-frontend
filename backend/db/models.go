package db

import "time"

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Name         string    `json:"name"`
	Role         string    `json:"role"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type Project struct {
	ID              string    `json:"id"`
	UserID          string    `json:"userId"`
	Name            string    `json:"name"`
	ThumbnailBase64 string    `json:"thumbnailBase64"`
	ImageCount      int       `json:"imageCount"`
	CreatedAt       time.Time `json:"createdAt"`
}

type Work struct {
	ID            string    `json:"id"`
	UserID        string    `json:"userId"`
	ProjectID     string    `json:"projectId"`
	ImageBase64   string    `json:"imageBase64"`
	RevisedPrompt string    `json:"revisedPrompt"`
	CreatedAt     time.Time `json:"createdAt"`
}

type PerlerPattern struct {
	ID              string    `json:"id"`
	UserID          string    `json:"userId"`
	ProjectID       string    `json:"projectId"`
	Name            string    `json:"name"`
	ImageBase64     string    `json:"imageBase64"`
	GridJSON        string    `json:"gridJson"`
	GridN           int       `json:"gridN"`
	GridM           int       `json:"gridM"`
	PixelationMode  string    `json:"pixelationMode"`
	ColorSystem     string    `json:"colorSystem"`
	BeadCount       int       `json:"beadCount"`
	ColorCountsJSON string    `json:"colorCountsJson"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}
