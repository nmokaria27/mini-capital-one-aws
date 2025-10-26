-- Aurora Serverless RDS Schema for Transaction History

CREATE DATABASE IF NOT EXISTS capitalone_banking;

USE capitalone_banking;

-- Transactions table to store all transaction history
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    transaction_type ENUM('deposit', 'withdrawal') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    balance_after DECIMAL(10, 2) NOT NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_transaction_date (transaction_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Optional: View for recent transactions
CREATE OR REPLACE VIEW recent_transactions AS
SELECT 
    transaction_id,
    user_id,
    transaction_type,
    amount,
    balance_after,
    transaction_date
FROM transactions
ORDER BY transaction_date DESC
LIMIT 100;
