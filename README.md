# Ecommerce Website

A full-stack ecommerce website built with HTML, CSS, Node.js, and MySQL.

## Features

- User authentication (register/login)
- Product catalog with categories
- Shopping cart functionality
- Checkout process
- Order history
- Responsive design

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up the MySQL database (see database.sql)
4. Update database configuration in server.js
5. Start the server: `node server.js`

## Database Setup

1. Create a MySQL database named `ecommerce_db`
2. Run the SQL commands from database.sql to create tables and sample data

## Usage

1. Access the application at http://localhost:3000
2. Register a new account or login with existing credentials
3. Browse products, add items to cart, and complete checkout

## Project Structure

- `public/` - Static assets (CSS, JS, images)
- `views/` - HTML templates
- `server.js` - Main server file
- `database.sql` - Database schema and sample data
- `package.json` - Project dependencies and scripts