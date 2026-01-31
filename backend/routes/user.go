package routes

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	models "github.com/YourGitHubUser/StockWise/backend/schemas"
	"github.com/YourGitHubUser/StockWise/backend/storage"
	"github.com/YourGitHubUser/StockWise/backend/utils"
	"github.com/YourGitHubUser/StockWise/backend/services"
	"github.com/joho/godotenv"
	"github.com/kataras/iris/v12"
	"golang.org/x/crypto/bcrypt"
)
func GetRiskMetrics(ctx iris.Context) {
    var req services.RiskMetricsRequest
    if err := ctx.ReadJSON(&req); err != nil {
        ctx.StatusCode(iris.StatusBadRequest)
        ctx.JSON(iris.Map{"error": "Invalid request"})
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
	stock.PurchasePrice = updateInput.PurchasePrice
	storage.DB.Save(&stock)

	ctx.JSON(iris.Map{
		"ID":            stock.ID,
		"Symbol":        stock.Symbol,
		"CompanyName":   stock.CompanyName,
		"Quantity":      stock.Quantity,
		"PurchasePrice": stock.PurchasePrice,
		"Sector":        stock.Sector,
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

// handles when the users adds a stock to their portfolio
func AddStock(ctx iris.Context) {
	var stockInput AddStockInput
	err := ctx.ReadJSON(&stockInput)
	if err != nil {
		utils.HandleValidationErrors(err, ctx)
		return
	}

	newStock := models.Stock{
		UserID:        stockInput.UserID,
		Symbol:        stockInput.Symbol,
		CompanyName:   stockInput.CompanyName,
		Quantity:      stockInput.Quantity,
		PurchasePrice: stockInput.PurchasePrice,
		Sector:        stockInput.Sector,
	}

	storage.DB.Create(&newStock)

	ctx.JSON(iris.Map{
		"ID":            newStock.ID,
		"Symbol":        newStock.Symbol,
		"CompanyName":   newStock.CompanyName,
		"Quantity":      newStock.Quantity,
		"PurchasePrice": newStock.PurchasePrice,
		"Sector":        newStock.Sector,
	})
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

// resource: https://www.youtube.com/watch?v=U6Q1iwaNrKI
func GetNews(ctx iris.Context) {
	// load the .env file
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file:", err)
	}
	// get the API key from environment variable
	api_key := os.Getenv("NEWS_API_KEY")

	// get user id from url param
	userID := ctx.URLParam("user_id")
	if userID == "" {
		utils.CreateError(iris.StatusBadRequest, "Bad Request", "User ID is required", ctx)
		return
	}

	// fetch user stocks from database
	var stocks []models.Stock
	result := storage.DB.Where("user_id = ?", userID).Find(&stocks)
	if result.Error != nil {
		utils.CreateInternalServerError(ctx)
		return
	}

	// build a list of keywords from the users stocks (company names and symbols)
	keywords := []string{}
	for _, stock := range stocks {
		if stock.CompanyName != "" {
			keywords = append(keywords, stock.CompanyName)
		}
		if stock.Symbol != "" {
			keywords = append(keywords, stock.Symbol)
		}
	}

	if len(keywords) == 0 {
		ctx.StatusCode(http.StatusBadRequest)
		ctx.JSON(iris.Map{"error": "No keywords found from user stocks"})
		return
	}

	// concatenate keywords and setting the timeframe
	query := strings.Join(keywords, " OR ")
	fromDate := time.Now().AddDate(0, 0, -7).Format("2006-01-02") // past 7 days
	toDate := time.Now().Format("2006-01-02")                     // today

	// make the http get request to get the news
	requestURL := fmt.Sprintf("https://newsapi.org/v2/everything?q=%s&from=%s&to=%s&apiKey=%s", query, fromDate, toDate, api_key)
	resp, err := http.Get(requestURL)
	if err != nil {
		ctx.StatusCode(http.StatusInternalServerError)
		ctx.JSON(iris.Map{"error": "Error making HTTP request to NewsAPI"})
		return
	}

	// this happenss after making the request
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatal("Error reading response body:", err)
	}

	fmt.Println(string(body))

	// slice of articles and each article has a title and description...
	var NewsData struct {
		Articles []struct {
			Title       string
			Description string
			Url         string
			PublishedAt string
		}
	}

	// unmarshelling means converting json data to go struct
	err = json.Unmarshal(body, &NewsData)
	if err != nil {
		log.Fatal(err)
	}

	// for i, article := range NewsData.Articles {
	// 	if i > 5 {
	// 		break
	// 	}
	// 	fmt.Println(article.Title)
	// 	fmt.Println(article.Description)
	// 	fmt.Println(article.Url)
	// 	fmt.Println(article.PublishedAt)
	// 	fmt.Println("--------------------------------")
}

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

type AddStockInput struct {
	UserID        uint    `json:"user_id" validate:"required"`
	Symbol        string  `json:"symbol" validate:"required"`
	CompanyName   string  `json:"company_name" validate:"required"`
	Quantity      float64 `json:"quantity" validate:"gte=0"`
	PurchasePrice float64 `json:"purchase_price" validate:"required,gt=0"`
	Sector        string  `json:"sector" validate:"required"`
}

type UpdateStockInput struct {
	StockID       uint    `json:"stock_id" validate:"required"`
	Quantity      float64 `json:"quantity" validate:"gte=0"`
	PurchasePrice float64 `json:"purchase_price" validate:"gt=0"`
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
