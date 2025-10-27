-- MySQL RDS Schema for Transaction History (Free Tier Compatible)

CREATE DATABASE IF NOT EXISTS capitalone_banking;

USE capitalone_banking;

-- Transactions table to store all transaction history
-- Updated to match instructions.md requirements
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id VARCHAR(36) PRIMARY KEY,  -- UUID format
    user_id VARCHAR(36) NOT NULL,
    transaction_type VARCHAR(10) NOT NULL,   -- 'DEPOSIT' or 'WITHDRAW' (uppercase)
    amount DECIMAL(12, 2) NOT NULL,
    balance_after DECIMAL(12, 2) NOT NULL,
    transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_transactions (user_id, transaction_date DESC)
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
