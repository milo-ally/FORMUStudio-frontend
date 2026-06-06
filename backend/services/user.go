package services

import (
	"errors"

	"github.com/formu/studio/db"
	"github.com/formu/studio/middleware"
	"golang.org/x/crypto/bcrypt"
)

type UserService struct {
	userRepo *db.UserRepo
}

func NewUserService(userRepo *db.UserRepo) *UserService {
	return &UserService{userRepo: userRepo}
}

type AuthResponse struct {
	Token  string `json:"token"`
	UserID string `json:"userId"`
	Email  string `json:"email"`
	Name   string `json:"name"`
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (s *UserService) Register(req *RegisterRequest) (*AuthResponse, error) {
	exists, err := s.userRepo.ExistsByEmail(req.Email)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.New("email already exists")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user, err := s.userRepo.Create(req.Email, string(hash), req.Name)
	if err != nil {
		return nil, err
	}

	token, err := middleware.GenerateToken(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		Token:  token,
		UserID: user.ID,
		Email:  user.Email,
		Name:   user.Name,
	}, nil
}

func (s *UserService) Login(req *LoginRequest) (*AuthResponse, error) {
	user, err := s.userRepo.GetByEmail(req.Email)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid credentials")
	}

	if user.Status != "ACTIVE" {
		return nil, errors.New("account is inactive")
	}

	token, err := middleware.GenerateToken(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		Token:  token,
		UserID: user.ID,
		Email:  user.Email,
		Name:   user.Name,
	}, nil
}
