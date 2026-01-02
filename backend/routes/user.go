package routes

import (
	"fmt"
	"strings"

	models "github.com/YourGitHubUser/StockWise/backend/schemas"
	"github.com/YourGitHubUser/StockWise/backend/storage"
	"github.com/YourGitHubUser/StockWise/backend/utils"
	"github.com/kataras/iris/v12"
	"golang.org/x/crypto/bcrypt"
)

func GetUserStocks(ctx iris.Context) {
	userID := ctx.URLParam("user_id")
	if userID == "" {
		utils.CreateError(iris.StatusBadRequest, "Bad Request", "User ID is required", ctx)
		return
	}

	var stocks []models.Stock
	result := storage.DB.Where("user_id = ?", userID).Find(&stocks)
	if result.Error != nil {
		utils.CreateInternalServerError(ctx)
		return
	}

	ctx.JSON(stocks)
}

func DeleteStock(ctx iris.Context) {
	stockID := ctx.URLParam("stock_id")
	if stockID == "" {
		utils.CreateError(iris.StatusBadRequest, "Bad Request", "Stock ID is required", ctx)
		return
	}

	result := storage.DB.Delete(&models.Stock{}, stockID)
	if result.Error != nil {
		utils.CreateInternalServerError(ctx)
		return
	}

	ctx.JSON(iris.Map{"message": "Stock deleted successfully"})
}

func UpdateStock(ctx iris.Context) {
	var updateInput UpdateStockInput
	err := ctx.ReadJSON(&updateInput)
	if err != nil {
		utils.HandleValidationErrors(err, ctx)
		return
	}

	var stock models.Stock
	result := storage.DB.First(&stock, updateInput.StockID)
	if result.Error != nil {
		utils.CreateError(iris.StatusNotFound, "Not Found", "Stock not found", ctx)
		return
	}

	stock.Quantity = updateInput.Quantity
	storage.DB.Save(&stock)

	ctx.JSON(iris.Map{
		"ID":          stock.ID,
		"Symbol":      stock.Symbol,
		"CompanyName": stock.CompanyName,
		"Quantity":    stock.Quantity,
	})
}

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

	// if we get to this point the user does not exist
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
}

func Login(ctx iris.Context) {
	var userInput LoginUserInput
	err := ctx.ReadJSON(&userInput)
	if err != nil {
		utils.HandleValidationErrors(err, ctx)
		return
	}

	var existingUser models.Users
	errMsg := "Invalid email or password."
	userExists, userExistsErr := getAndHandleUserExists(&existingUser, userInput.Email)
	// if theres a user exists error we need to create an internal server error
	if userExistsErr != nil {
		utils.CreateInternalServerError(ctx)
		return
	}

	// if false user hasnt regeistered or gave faulty details
	if userExists == false {
		utils.CreateError(iris.StatusUnauthorized, "Credentials Error", errMsg, ctx)
		return
	}

	// if the user logged in with a social account they cant login with password
	if existingUser.SocialLogin == true {
		utils.CreateError(iris.StatusUnauthorized, "Credentials Error", "Social Login account.", ctx)
		return
	}

	passwordErr := bcrypt.CompareHashAndPassword([]byte(existingUser.Password), []byte(userInput.Password))
	if passwordErr != nil {
		utils.CreateError(iris.StatusUnauthorized, "Credentials Error", errMsg, ctx)
		return
	}

	// at this point th euser gave th eright error
	ctx.JSON(iris.Map{
		"ID":       existingUser.ID,
		"Username": existingUser.Username,
		"Email":    existingUser.Email,
	})
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

// handles when the users adds a stock to their portfolio
func AddStock(ctx iris.Context) {
	var stockInput AddStockInput
	err := ctx.ReadJSON(&stockInput)
	if err != nil {
		utils.HandleValidationErrors(err, ctx)
		return
	}

	newStock := models.Stock{
		UserID:      stockInput.UserID,
		Symbol:      stockInput.Symbol,
		CompanyName: stockInput.CompanyName,
		Quantity:    stockInput.Quantity,
	}

	storage.DB.Create(&newStock)

	ctx.JSON(iris.Map{
		"ID":          newStock.ID,
		"Symbol":      newStock.Symbol,
		"CompanyName": newStock.CompanyName,
		"Quantity":    newStock.Quantity,
	})
}

type RegisterUserInput struct {
	Username string `json:"username" validate:"required,min=3,max=256"`
	Password string `json:"password" validate:"required,min=6,max=256"`
	Email    string `json:"email" validate:"required,email"`
}

type LoginUserInput struct {
	Password string `json:"password" validate:"required"`
	Email    string `json:"email" validate:"required,email"`
}

type AddStockInput struct {
	UserID      uint    `json:"user_id" validate:"required"`
	Symbol      string  `json:"symbol" validate:"required"`
	CompanyName string  `json:"company_name" validate:"required"`
	Quantity    float64 `json:"quantity" validate:"gte=0"`
}

type UpdateStockInput struct {
	StockID  uint    `json:"stock_id" validate:"required"`
	Quantity float64 `json:"quantity" validate:"gte=0"`
}
