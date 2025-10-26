# Architecture Overview

## System Components

### 1. IAM (Identity Access Management)
- Controls access to all AWS resources
- Manages Lambda execution roles
- Secures API Gateway endpoints

### 2. S3 Static Website Hosting
- Hosts frontend (HTML, CSS, JavaScript)
- Public access for web interface
- Low-cost, highly available hosting

### 3. Lambda Functions

#### createUser Lambda
- **Trigger**: API Gateway POST request
- **Input**: Full Name, DOB, Email, Initial Balance
- **Process**: Generates unique userId, creates user record
- **Output**: Writes to DynamoDB, returns userId

#### transactionService Lambda
- **Trigger**: API Gateway POST request
- **Input**: userId, transaction type, amount
- **Process**: 
  1. Retrieves current balance from DynamoDB
  2. Validates transaction (sufficient funds for withdrawal)
  3. Updates balance in DynamoDB
  4. Records transaction in Aurora RDS
- **Output**: New balance, transaction confirmation

### 4. DynamoDB (NoSQL)
- **Table**: CapitalOne-Users
- **Primary Key**: userId
- **Attributes**: fullName, dob, email, balance, createdAt, updatedAt
- **Purpose**: Fast access to user profiles and current balances

### 5. Aurora Serverless RDS (SQL)
- **Table**: transactions
- **Columns**: transaction_id, user_id, transaction_type, amount, balance_after, transaction_date
- **Purpose**: Detailed transaction history with relational queries

## Data Flow

1. User accesses S3 website
2. User creates account → API Gateway → createUser Lambda → DynamoDB
3. User makes transaction → API Gateway → transactionService Lambda → DynamoDB + Aurora RDS
4. Frontend displays updated balance from DynamoDB
