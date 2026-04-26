package routes

import (
	"log"
	"strconv"
	"strings"

	models "github.com/YourGitHubUser/StockWise/backend/schemas"
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
	UserID      uint              `json:"user_id"`
	Symbol      string            `json:"symbol" validate:"required"`
	CompanyName string            `json:"company_name" validate:"required"`
	Sector      string            `json:"sector" validate:"required"`
	Entries     []StockEntryInput `json:"entries" validate:"required"`
}

type UpdateStockInput struct {
	Entries []StockEntryInput `json:"entries" validate:"required"`
}

type UpdateRiskInput struct {
	Risk string `json:"risk" validate:"required"`
}

type NewsItem struct {
	CompanyName string `json:"companyName"`
	Headline    string `json:"headline"`
	ImageUrl    string `json:"imageUrl"`
	Date        string `json:"date"`
}

func Register(ctx iris.Context) {
	// read request body
	var userInput RegisterUserInput
	err := ctx.ReadJSON(&userInput)
	if err != nil {
		utils.HandleValidationErrors(err, ctx)
		return
	}

	// check if email is already used
	var newUser models.Users
	userExists, userExistsErr := getAndHandleUserExists(&newUser, userInput.Email)
	if userExistsErr != nil {
		utils.CreateError(
			iris.StatusConflict,
			"Conflict",
			"Email already registered",
			ctx,
		)
		return
	}

	if userExists == true {
		return
	}

	// hash password before storing
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
	// read request body
	var userInput LoginUserInput
	err := ctx.ReadJSON(&userInput)
	if err != nil {
		utils.HandleValidationErrors(err, ctx)
		return
	}

	var existingUser models.Users
	errMsg := "Invalid email or password."
	userExists, userExistsErr := getAndHandleUserExists(&existingUser, userInput.Email)
	// stop early if user lookup fails
	if userExistsErr != nil {
		utils.CreateInternalServerError(ctx)
		return
	}

	// rejecting unkown accounts 
	if userExists == false {
		utils.CreateError(iris.StatusUnauthorized, "Credentials Error", errMsg, ctx)
		return
	}

	passwordErr := bcrypt.CompareHashAndPassword([]byte(existingUser.Password), []byte(userInput.Password))
	if passwordErr != nil {
		utils.CreateError(iris.StatusUnauthorized, "Credentials Error", errMsg, ctx)
		return
	}

	ctx.JSON(iris.Map{
		"ID":       existingUser.ID,
		"Username": existingUser.Username,
		"Email":    existingUser.Email,
		"Risk":     existingUser.Risk,
	})
}

// check if user exists by email
func getAndHandleUserExists(user *models.Users, email string) (exists bool, err error) {
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
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	if err != nil {
		return "", err
	}

	return string(bytes), nil
}

func AddStock(ctx iris.Context) {
	// read user id from route
	userID, err := strconv.ParseUint(ctx.Params().Get("userId"), 10, 64)
	if err != nil {
		utils.CreateError(iris.StatusBadRequest, "Bad Request", "User ID is required", ctx)
		return
	}

	// read request body
	var stockInput AddStockInput
	err = ctx.ReadJSON(&stockInput)
	if err != nil {
		utils.HandleValidationErrors(err, ctx)
		return
	}

	stockInput.UserID = uint(userID)

	// validating the symbol input
	capitalSymbol := strings.ToUpper(strings.TrimSpace(stockInput.Symbol))
	if capitalSymbol == "" {
		utils.CreateError(iris.StatusBadRequest, "Bad Request", "Stock symbol is required", ctx)
		return
	}

	// prevent duplicate stock for same user
	var existingStock models.Stock
	result := storage.DB.Where("user_id = ? AND symbol = ?", stockInput.UserID, capitalSymbol).First(&existingStock)
	if result.Error == nil {
		utils.CreateError(iris.StatusConflict, "Invalid", "Stock already exists for this user", ctx)
		return
	}

	stockInput.Symbol = capitalSymbol

	// create stock and related entries
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
	// read route params
	userID, userIDErr := strconv.ParseUint(ctx.Params().Get("userId"), 10, 64)
	if userIDErr != nil {
		utils.CreateError(iris.StatusBadRequest, "Bad Request", "User ID is required", ctx)
		return
	}

	stockID, stockIDErr := strconv.ParseUint(ctx.Params().Get("stockId"), 10, 64)
	if stockIDErr != nil {
		utils.CreateError(iris.StatusBadRequest, "Bad Request", "Stock ID is required", ctx)
		return
	}

	// read request body
	var updateInput UpdateStockInput
	err := ctx.ReadJSON(&updateInput)
	if err != nil {
		utils.HandleValidationErrors(err, ctx)
		return
	}

	// load stock and verify owner
	var stock models.Stock
	result := storage.DB.Where("id = ? AND user_id = ?", uint(stockID), uint(userID)).First(&stock)
	if result.Error != nil {
		utils.CreateError(iris.StatusNotFound, "Not Found", "Stock not found", ctx)
		return
	}

	// replace existing entries with new values
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

func GetUserStocks(ctx iris.Context) {
	// read user id from route
	userID := ctx.Params().Get("userId")
	if userID == "" {
		utils.CreateError(iris.StatusBadRequest, "Bad Request", "User ID is required", ctx)
		return
	}

	// fetch stocks with related entries
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
	// read route params
	userID := ctx.Params().Get("userId")
	if userID == "" {
		utils.CreateError(iris.StatusBadRequest, "Bad Request", "User ID is required", ctx)
		return
	}

	stockID := ctx.Params().Get("stockId")
	if stockID == "" {
		utils.CreateError(iris.StatusBadRequest, "Bad Request", "Stock ID is required", ctx)
		return
	}

	// delete only if stock belongs to user
	result := storage.DB.Where("id = ? AND user_id = ?", stockID, userID).Delete(&models.Stock{})
	if result.Error != nil {
		utils.CreateInternalServerError(ctx)
		return
	}

	ctx.JSON(iris.Map{"message": "Stock deleted successfully"})
}

func GetRiskPreference(ctx iris.Context) {
	// read user id from route
	userID := ctx.Params().Get("userId")
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

// update user risk preference
func UpdateRisk(ctx iris.Context) {
	// read user id from route
	userID, err := strconv.ParseUint(ctx.Params().Get("userId"), 10, 64)
	if err != nil {
		utils.CreateError(iris.StatusBadRequest, "Bad Request", "User ID is required", ctx)
		return
	}

	// read request body
	var riskInput UpdateRiskInput
	err = ctx.ReadJSON(&riskInput)
	if err != nil {
		utils.HandleValidationErrors(err, ctx)
		return
	}

	// load the user and apply the new risk value
	var user models.Users
	result := storage.DB.First(&user, uint(userID))
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
