package routes

import (
	"fmt"
	"log"
	"strings"

	models "github.com/YourGitHubUser/StockWise/backend/schemas"
	"github.com/YourGitHubUser/StockWise/backend/services"
	"github.com/YourGitHubUser/StockWise/backend/storage"
	"github.com/YourGitHubUser/StockWise/backend/utils"
	"github.com/kataras/iris/v12"
	"golang.org/x/crypto/bcrypt"
)

type RegisterUserInput struct {
	Username string `json:"username" validate:"required,min=3,max=256"`
	Password string `json:"password" validate:"required,min=6,max=256"`
	Email    string `json:"email" validate:"required,email"`
	Risk     string `json:"risk" validate:"required"`
}

type LoginUserInput struct {
	Password string `json:"password" validate:"required"`
	Email    string `json:"email" validate:"required,email"`
}

type StockEntryInput struct {
	Quantity      float64 `json:"quantity" validate:"gte=0"`
	PurchasePrice float64 `json:"purchase_price" validate:"gte=0"`
}

type AddStockInput struct {
	UserID        uint               `json:"user_id" validate:"required"`
	Symbol        string             `json:"symbol" validate:"required"`
	CompanyName   string             `json:"company_name" validate:"required"`
	Sector        string             `json:"sector" validate:"required"`
	Entries       []StockEntryInput  `json:"entries" validate:"required"`
}

type UpdateStockInput struct {
	StockID uint               `json:"stock_id" validate:"required"`
	Entries []StockEntryInput  `json:"entries" validate:"required"`
}

type UpdateRiskInput struct {
	UserID uint   `json:"user_id" validate:"required"`
	Risk   string `json:"risk" validate:"required"`
}

type NewsItem struct {
	CompanyName string `json:"companyName"`
	Headline    string `json:"headline"`
	ImageUrl    string `json:"imageUrl"`
	Date        string `json:"date"`
}

func GetRiskMetrics(ctx iris.Context) {
	log.Println("[RiskMetrics] Incoming request to /api/services/risk-metrics")
	var req services.RiskMetricsRequest
	if err := ctx.ReadJSON(&req); err != nil {
		ctx.StatusCode(iris.StatusBadRequest)
		ctx.JSON(iris.Map{"error": "Invalid request", "details": err.Error()})
		return
	}
	log.Printf("[RiskMetrics] Request body: %+v\n", req)
	if req.Stocks == nil || len(req.Stocks) == 0 {
		ctx.StatusCode(iris.StatusBadRequest)
		ctx.JSON(iris.Map{"error": "No stocks provided"})
		return
	}
	result, err := services.CalculateRiskMetrics(req.Stocks)
	if err != nil {
		ctx.StatusCode(iris.StatusInternalServerError)
		ctx.JSON(iris.Map{"error": err.Error()})
		return
	}
	ctx.JSON(result)
}

func GetStockRiskCategories(ctx iris.Context) {
	log.Println("[StockRiskCategories] Incoming request to /api/services/stock-risk-categories")
	var req services.StockRiskCategoriesRequest
	if err := ctx.ReadJSON(&req); err != nil {
		ctx.StatusCode(iris.StatusBadRequest)
		ctx.JSON(iris.Map{"error": "Invalid request", "details": err.Error()})
		return
	}

	if req.Stocks == nil || len(req.Stocks) == 0 {
		ctx.StatusCode(iris.StatusBadRequest)
		ctx.JSON(iris.Map{"error": "No stocks provided"})
		return
	}

	result, err := services.CalculateStockRiskCategories(req.Stocks)
	if err != nil {
		ctx.StatusCode(iris.StatusInternalServerError)
		ctx.JSON(iris.Map{"error": err.Error()})
		return
	}

	ctx.JSON(result)
}

func GetRiskPreference(ctx iris.Context) {
	userID := ctx.URLParam("user_id")
	if userID == "" {
		utils.CreateError(iris.StatusBadRequest, "Bad Request", "User ID is required", ctx)
		return
	}
	var user models.Users
	result := storage.DB.Where("id = ?", userID).First(&user)
	if result.Error != nil {
		utils.CreateInternalServerError(ctx)
		return
	}

	ctx.JSON(iris.Map{"risk": user.Risk})
}

func GetUserStocks(ctx iris.Context) {
	userID := ctx.URLParam("user_id")
	if userID == "" {
		utils.CreateError(iris.StatusBadRequest, "Bad Request", "User ID is required", ctx)
		return
	}

	var stocks []models.Stock
	result := storage.DB.Preload("Entries").Where("user_id = ?", userID).Find(&stocks)
	if result.Error != nil {
		log.Printf("[GetUserStocks] failed for user_id=%s: %v", userID, result.Error)
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
		Risk:        userInput.Risk,
		SocialLogin: false,
	}

	storage.DB.Create(&newUser)

	ctx.JSON(iris.Map{
		"ID":       newUser.ID,
		"Username": newUser.Username,
		"Email":    newUser.Email,
		"Risk":     newUser.Risk,
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
		"Risk":     existingUser.Risk,
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
		Sector:      stockInput.Sector,
	}

	storage.DB.Create(&newStock)

	for _, entry := range stockInput.Entries {
		newEntry := models.StockEntry{
			StockID:       newStock.ID,
			Quantity:      entry.Quantity,
			PurchasePrice: entry.PurchasePrice,
		}
		storage.DB.Create(&newEntry)
	}

	ctx.JSON(newStock)
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

	storage.DB.Where("stock_id = ?", stock.ID).Delete(&models.StockEntry{})

	for _, entry := range updateInput.Entries {
		newEntry := models.StockEntry{
			StockID:       stock.ID,
			Quantity:      entry.Quantity,
			PurchasePrice: entry.PurchasePrice,
		}
		storage.DB.Create(&newEntry)
	}

	ctx.JSON(stock)
}

// handles when the user updates their risk profile
func UpdateRisk(ctx iris.Context) {
	var riskInput UpdateRiskInput
	err := ctx.ReadJSON(&riskInput)
	if err != nil {
		utils.HandleValidationErrors(err, ctx)
		return
	}

	var user models.Users
	result := storage.DB.First(&user, riskInput.UserID)
	if result.Error != nil {
		utils.CreateError(iris.StatusNotFound, "Not Found", "User not found", ctx)
		return
	}

	user.Risk = riskInput.Risk
	storage.DB.Save(&user)

	ctx.JSON(iris.Map{
		"ID":       user.ID,
		"Username": user.Username,
		"Email":    user.Email,
		"Risk":     user.Risk,
	})
}

func GetPerformanceMetrics(ctx iris.Context) {
	log.Println("[PerformanceMetrics] Incoming request to /api/services/performance-metrics")
	var req services.PerformanceMetricsRequest
	if err := ctx.ReadJSON(&req); err != nil {
		ctx.StatusCode(iris.StatusBadRequest)
		ctx.JSON(iris.Map{"error": "Invalid request", "details": err.Error()})
		return
	}
	if req.Stocks == nil || len(req.Stocks) == 0 {
		ctx.StatusCode(iris.StatusBadRequest)
		ctx.JSON(iris.Map{"error": "No stocks provided"})
		return
	}
	result, err := services.CalculatePerformanceMetrics(req)
	if err != nil {
		ctx.StatusCode(iris.StatusInternalServerError)
		ctx.JSON(iris.Map{"error": err.Error()})
		return
	}
	ctx.JSON(result)
}
