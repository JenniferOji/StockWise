package models

// abstract sql statements
import "gorm.io/gorm"

type Users struct {
	gorm.Model            // adds ID, CreatedAt, UpdatedAt, DeletedAt fields
	Username       string `json:"username"`
	Password       string `json:"password"`
	Email          string `json:"email"`
	SocialLogin    bool   `json:"social_login"`
	SocialProvider string `json:"social_provider"`
}
