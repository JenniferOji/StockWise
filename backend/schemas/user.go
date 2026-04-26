package models

// abstract sql statements
import "gorm.io/gorm"

type Users struct {
	gorm.Model             
	Username       string  `json:"username"`
	Password       string  `json:"password"`
	Email          string  `json:"email" gorm:"uniqueIndex"`
	Risk           string  `json:"risk"`
	SocialLogin    bool    `json:"social_login"`
	SocialProvider string  `json:"social_provider"`
	Stocks         []Stock `gorm:"foreignKey:UserID" json:"stocks"`
}

type Stock struct {
	gorm.Model
	UserID        uint    `json:"user_id"`
	Symbol        string  `json:"symbol"`
	CompanyName   string  `json:"company_name"`
	Quantity      float64 `json:"quantity"`
	PurchasePrice float64 `json:"purchase_price"`
	Sector        string  `json:"sector"`
	Entries     []StockEntry    `gorm:"foreignKey:StockID" json:"entries"`
}

type StockEntry struct {
	gorm.Model
	StockID       uint    `json:"stock_id"`
	Quantity      float64 `json:"quantity"`
	PurchasePrice float64 `json:"purchase_price"`
}