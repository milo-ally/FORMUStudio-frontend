package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"

	"github.com/formu/studio/db"
	"github.com/formu/studio/handlers"
	"github.com/formu/studio/middleware"
	"github.com/formu/studio/services"
	_ "github.com/mattn/go-sqlite3"
)

func main() {
	database, err := sql.Open("sqlite3", "./formu.db")
	if err != nil {
		log.Fatal(err)
	}
	defer database.Close()

	if err := db.Migrate(database); err != nil {
		log.Fatal(err)
	}

	userRepo := db.NewUserRepo(database)
	projectRepo := db.NewProjectRepo(database)
	workRepo := db.NewWorkRepo(database)
	perlerRepo := db.NewPerlerPatternRepo(database)

	userService := services.NewUserService(userRepo)
	projectService := services.NewProjectService(projectRepo, workRepo)
	workService := services.NewWorkService(workRepo, projectRepo)
	perlerService := services.NewPerlerService(perlerRepo)

	authHandler := handlers.NewAuthHandler(userService)
	projectHandler := handlers.NewProjectHandler(projectService)
	workHandler := handlers.NewWorkHandler(workService)
	perlerHandler := handlers.NewPerlerHandler(perlerService)

	mux := http.NewServeMux()

	mux.HandleFunc("POST /api/auth/register", authHandler.Register)
	mux.HandleFunc("POST /api/auth/login", authHandler.Login)

	mux.HandleFunc("GET /api/data/projects", middleware.Auth(projectHandler.List))
	mux.HandleFunc("GET /api/data/projects/{id}", middleware.Auth(projectHandler.Get))
	mux.HandleFunc("POST /api/data/projects", middleware.Auth(projectHandler.Create))
	mux.HandleFunc("PUT /api/data/projects/{id}", middleware.Auth(projectHandler.Update))
	mux.HandleFunc("DELETE /api/data/projects/{id}", middleware.Auth(projectHandler.Delete))

	mux.HandleFunc("GET /api/data/works", middleware.Auth(workHandler.List))
	mux.HandleFunc("POST /api/data/works", middleware.Auth(workHandler.Create))
	mux.HandleFunc("DELETE /api/data/works/{id}", middleware.Auth(workHandler.Delete))

	mux.HandleFunc("GET /api/data/perler-patterns", middleware.Auth(perlerHandler.List))
	mux.HandleFunc("GET /api/data/perler-patterns/{id}", middleware.Auth(perlerHandler.Get))
	mux.HandleFunc("POST /api/data/perler-patterns", middleware.Auth(perlerHandler.Create))
	mux.HandleFunc("PUT /api/data/perler-patterns/{id}", middleware.Auth(perlerHandler.Update))
	mux.HandleFunc("DELETE /api/data/perler-patterns/{id}", middleware.Auth(perlerHandler.Delete))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, cors(mux)))
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
