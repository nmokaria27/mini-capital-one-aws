CREATE DATABASE IF NOT EXISTS capitalone_banking;
USE capitalone_banking;

CREATE TABLE IF NOT EXISTS transactions (
  transaction_id   VARCHAR(36) PRIMARY KEY,
  user_id          VARCHAR(64) NOT NULL,
  transaction_type VARCHAR(10) NOT NULL, -- 'DEPOSIT'|'WITHDRAW'
  amount           DECIMAL(12,2) NOT NULL,
  balance_after    DECIMAL(12,2) NOT NULL,
  transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_user_id
  ON transactions (user_id, transaction_date DESC);
