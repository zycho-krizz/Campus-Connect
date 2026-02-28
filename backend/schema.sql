-- Campus Connect MySQL Database Schema

-- Create Database
CREATE DATABASE IF NOT EXISTS campus_connect;
USE campus_connect;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL, -- College Email
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'admin') DEFAULT 'student',
    phone_number VARCHAR(15) DEFAULT NULL,
    department VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Creating a default Admin user (password: admin123)
-- In a real app, use bcrypt handles this. Assuming simple hash comparison for prototype.
INSERT INTO users (full_name, email, password, role) 
VALUES ('System Admin', 'admin@campus.edu', '$2b$10$wTfHIt9oP7nSgI.yqToYDO2U8YwXw1hA5n5F17v5r1M9R1rO', 'admin')
ON DUPLICATE KEY UPDATE id=id;

-- Resources Table
CREATE TABLE IF NOT EXISTS resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    category ENUM('Books', 'Electronics', 'Sports', 'Notes', 'Other') NOT NULL,
    item_condition ENUM('New', 'Like New', 'Good', 'Fair', 'Poor') NOT NULL,
    ownership_type ENUM('sell', 'share') NOT NULL,
    price DECIMAL(10, 2) DEFAULT 0.00,
    description TEXT,
    status ENUM('available', 'requested', 'completed', 'removed') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Requests Table
CREATE TABLE IF NOT EXISTS requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resource_id INT NOT NULL,
    requester_id INT NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
    request_type ENUM('buy', 'share') NOT NULL,
    phone_number VARCHAR(15), -- Used during checkout flow
    department VARCHAR(100),  -- Used during checkout flow
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE
);
