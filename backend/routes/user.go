package routes

import (
	"fmt"
	"strings"

	"github.com/YourGitHubUser/StockWise/backend/models"
	"github.com/YourGitHubUser/StockWise/backend/storage"
	"github.com/YourGitHubUser/StockWise/backend/utils"
	"github.com/kataras/iris/v12"
	"golang.org/x/crypto/bcrypt"
)

func Register(ctx iris.Context) {
	var userInput RegisterUserInput
	err := ctx.ReadJSON(&userInput)
	if err != nil {
		utils.HandleValidationErrors(err, ctx)
		return
	}

	var newUser models.Users
	userExists, userExistsErr := getAndHandleUserExists(&newUser, userInput.Email)
	if userExistsErr != nil {
		utils.CreateError(
			iris.StatusConflict,
			"Conflict",
			"Email already registered", // decription shown to user
			ctx,
		)
		return
	}

	if userExists == true {
		fmt.Println("User already exists")
		return
	}

	hashedPassword, hashErr := hashAndSaltPassword(userInput.Password)
	if hashErr != nil {
		utils.CreateInternalServerError(ctx)
		return
	}

	newUser = models.Users{
		Username:    userInput.Username,
		Password:    hashedPassword,
		Email:       userInput.Email,
		SocialLogin: false,
	}

	storage.DB.Create(&newUser)

	ctx.JSON(iris.Map{
		"ID":       newUser.ID,
		"Username": newUser.Username,
		"Email":    newUser.Email,
	})
	// if we get to this point the user does not exist
}

// takes in user model pointer and email string to check if user exists
func getAndHandleUserExists(user *models.Users, email string) (exists bool, err error) {
	// query the dsatabase for a user with the given email
	userExistsQuery := storage.DB.Where("email = ?", strings.ToLower(email)).Limit(1).Find(user)

	if userExistsQuery.Error != nil {
		return false, userExistsQuery.Error
	}

	exists = userExistsQuery.RowsAffected > 0

	if exists == true {
		return true, nil
	}

	return false, nil
}

func hashAndSaltPassword(password string) (hashedPassword string, err error) {
	// generate a hashed and salted password from the given password string
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	if err != nil {
		return "", err
	}

	return string(bytes), nil
}

type RegisterUserInput struct {
	Username string `json:"username" validate:"required,min=3,max=256"`
	Password string `json:"password" validate:"required,min=6,max=256"`
	Email    string `json:"email" validate:"required,email"`
}
