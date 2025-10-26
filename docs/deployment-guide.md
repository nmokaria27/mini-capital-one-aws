# Deployment Guide

## Prerequisites
- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Node.js installed (for Lambda functions)

## Step-by-Step Deployment

### 1. DynamoDB Setup
```bash
aws dynamodb create-table --cli-input-json file://database/dynamodb-schema.json
```

### 2. Aurora Serverless RDS Setup
1. Go to AWS RDS Console
2. Create Aurora Serverless MySQL cluster
3. Configure VPC and security groups
4. Connect to database and run `database/aurora-schema.sql`
5. Save credentials in AWS Secrets Manager

### 3. IAM Role Setup
```bash
# Create Lambda execution role
aws iam create-role --role-name CapitalOneLambdaRole \
  --assume-role-policy-document file://iam/lambda-execution-role.json

# Attach policy
aws iam put-role-policy --role-name CapitalOneLambdaRole \
  --policy-name CapitalOneLambdaPolicy \
  --policy-document file://iam/lambda-policy.json
```

### 4. Lambda Function Deployment

#### createUser Lambda
```bash
cd lambda-functions/createUser
npm install
zip -r createUser.zip .
aws lambda create-function --function-name createUser \
  --runtime nodejs18.x --role arn:aws:iam::ACCOUNT_ID:role/CapitalOneLambdaRole \
  --handler index.handler --zip-file fileb://createUser.zip \
  --environment Variables={DYNAMODB_TABLE_NAME=CapitalOne-Users}
```

#### transactionService Lambda
```bash
cd lambda-functions/transactionService
npm install
zip -r transactionService.zip .
aws lambda create-function --function-name transactionService \
  --runtime nodejs18.x --role arn:aws:iam::ACCOUNT_ID:role/CapitalOneLambdaRole \
  --handler index.handler --zip-file fileb://transactionService.zip \
  --environment Variables={DYNAMODB_TABLE_NAME=CapitalOne-Users,RDS_HOST=your-rds-endpoint,RDS_USER=admin,RDS_PASSWORD=your-password,RDS_DATABASE=capitalone_banking}
```

### 5. API Gateway Setup
1. Create REST API in API Gateway
2. Create resources and methods (POST for createUser, POST for transaction)
3. Integrate with Lambda functions
4. Enable CORS
5. Deploy API to stage
6. Copy API Gateway URLs

### 6. S3 Static Website Hosting
```bash
# Create bucket
aws s3 mb s3://capitalone-banking-app

# Enable static website hosting
aws s3 website s3://capitalone-banking-app --index-document index.html

# Update API endpoints in frontend/app.js with your API Gateway URLs

# Upload files
aws s3 sync frontend/ s3://capitalone-banking-app --acl public-read

# Set bucket policy for public access
```

### 7. Testing
1. Access S3 website URL
2. Test user creation
3. Test transactions
4. Verify data in DynamoDB and RDS

## Important Notes
- Replace `ACCOUNT_ID` with your AWS account ID
- Update RDS credentials in Lambda environment variables
- Ensure Lambda has VPC access to RDS
- Configure security groups properly
