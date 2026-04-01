package storage

import (
	"fmt"
	"os"

	models "github.com/YourGitHubUser/StockWise/backend/schemas"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

// connectToDatabase opens a connection and returns the *gorm.DB so callers can use it
func connectToDatabase() *gorm.DB {
	// err := godotenv.Load()
	// // if there is an error loading .env file raise a panic
	// if err != nil {
	// 	panic("Error loading .env file")
	// }

	_ = godotenv.Load()

	// first pass in the connection string then the gorm open function
	dsn := os.Getenv("DB_CONNECTION_STRING")
	if dsn == "" {
		panic("DB_CONNECTION_STRING is not set")
	}

	fmt.Println("Connecting to database")

	db, dbError := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if dbError != nil {
		panic(fmt.Sprintf("Failed to connect to database: %v", dbError))
	}

	DB = db
	return db
}

// takes in a database connection and performs auto migrations which is creating tables based on models
func performMigrations(db *gorm.DB) {
	// auto migrate the User model to create/update the users table
	db.AutoMigrate(
		&models.Users{},
		&models.Stock{},
		&models.StockEntry{},
	)
}

func InitialiseDatabase() *gorm.DB {
	db := connectToDatabase()
	performMigrations(db)
	return db
}
