# Capital One Banking System - AWS Midterm Project

## Project Overview
A micro-level implementation of Capital One's web application architecture using AWS services.

## Architecture Components

### AWS Services Used:
- **IAM**: User authentication and access management
- **S3**: Static website hosting for web interface
- **Lambda**: Serverless functions for business logic
- **DynamoDB**: NoSQL database for customer data and balances
- **Aurora Serverless RDS**: SQL database for transaction history

## Architecture Flow
1. User accesses web interface hosted on S3
2. IAM handles authentication
3. User actions trigger Lambda functions:
   - **Customer Data Lambda**: Creates/updates user profiles in DynamoDB
   - **Transaction Lambda**: Processes transactions, updates DynamoDB balance, logs to Aurora RDS

## Project Structure
```
├── frontend/           # S3 hosted web interface
├── lambda-functions/   # Lambda function code
├── database/          # Database schemas and setup
├── iam/              # IAM policies and configurations
├── docs/             # Documentation and diagrams
└── tests/            # Testing scripts
```

## Team Division
See `docs/task-division.md` for detailed task breakdown.

## Setup Instructions
1. Configure AWS credentials
2. Set up IAM roles and policies
3. Create S3 bucket for static hosting
4. Deploy Lambda functions
5. Initialize DynamoDB tables
6. Set up Aurora Serverless RDS
7. Deploy frontend to S3

## Requirements
- AWS Account
- AWS CLI configured
- Node.js (for Lambda functions)
- Basic knowledge of HTML/CSS/JavaScript

## Getting Started
Refer to individual component READMEs in their respective directories.
