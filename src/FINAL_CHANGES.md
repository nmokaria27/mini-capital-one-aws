# Capital One Banking - Final Project Changes

## Overview
This document tracks all changes made for the final submission, adding 4 new AWS services to the existing midterm project.

## New AWS Services Added
1. **SNS (Simple Notification Service)** - Publishes transaction events
2. **SES (Simple Email Service)** - Sends email notifications to users
3. **S3** - Stores account statements (on-demand via API, and monthly via EventBridge)
4. **EventBridge** - Optionally schedules monthly statement generation

## Architecture Changes

### Before (Midterm)
```
User → API Gateway → Lambda → DynamoDB
```

### After (Final)
```
User → API Gateway → Lambda → DynamoDB
                        ↓
                      SNS Topic
                        ↓
                  sendNotification Lambda → SES → Email

EventBridge (Monthly) → generateStatement Lambda → S3 Bucket
getStatement Lambda → S3 Bucket
```

---

## Files Created

### New Lambda Functions

| File | Purpose |
|------|---------|
| `lambdas/sendNotification/index.mjs` | Receives SNS events, sends emails via SES |
| `lambdas/generateStatement/index.mjs` | Generates monthly statements for all users, uploads to S3 (EventBridge) |
| `lambdas/getStatement/index.mjs` | Generates an on-demand statement for a single user, uploads to S3, returns pre-signed URL |

### New Scripts

| File | Purpose |
|------|---------|
| `scripts/setup-sns.sh` | Creates SNS topic and subscriptions |
| `scripts/setup-s3-statements.sh` | Creates S3 bucket for statements |
| `scripts/setup-eventbridge.sh` | Creates scheduled rule for monthly statements |
| `scripts/deploy-sendNotification.sh` | Deploys sendNotification Lambda |
| `scripts/deploy-generateStatement.sh` | Deploys generateStatement Lambda |
| `scripts/deploy-getStatement.sh` | Deploys getStatement Lambda |

---

## Files Modified

### Lambda Functions

| File | Changes |
|------|---------|
| `lambdas/transactionService/index.mjs` | Added SNS publish after successful transaction |
| `lambdas/createUser/index.mjs` | Added emailNotifications field, stores transaction history |

### Frontend

| File | Changes |
|------|---------|
| `frontend/index.html` | Added email notification checkbox, download statement button |
| `frontend/app.js` | Added statement download functionality |

### Database

| File | Changes |
|------|---------|
| `database/dynamodb-schema.json` | Added emailNotifications and transactionHistory fields |

---

## AWS Console Setup Required

### 1. S3 Bucket
- **Name**: `capitalone-statements-{unique-id}`
- **Region**: us-east-1
- **Public Access**: Blocked

### 2. SNS Topic
- **Name**: `CapitalOne-Transactions`
- **Type**: Standard

### 3. SES Setup
- Verify sender email address
- Verify recipient emails (sandbox mode)

### 4. EventBridge Rule (Optional)
- **Name**: `MonthlyStatementGenerator`
- **Schedule**: `cron(0 8 1 * ? *)`
- **Target**: generateStatement Lambda (bulk monthly statements)

---

## IAM Policy Updates

### transactionService Lambda
```json
{
  "Effect": "Allow",
  "Action": "sns:Publish",
  "Resource": "arn:aws:sns:us-east-1:*:CapitalOne-Transactions"
}
```

### sendNotification Lambda
```json
{
  "Effect": "Allow",
  "Action": "ses:SendEmail",
  "Resource": "*"
}
```

### generateStatement Lambda
```json
{
  "Effect": "Allow",
  "Action": ["dynamodb:Scan", "s3:PutObject"],
  "Resource": ["arn:aws:dynamodb:*:*:table/CapitalOne-Users", "arn:aws:s3:::capitalone-statements-*/*"]
}
```

### getStatement Lambda
```json
{
  "Effect": "Allow",
  "Action": [
    "dynamodb:GetItem",
    "s3:PutObject",
    "s3:GetObject"
  ],
  "Resource": [
    "arn:aws:dynamodb:us-east-1:*:table/CapitalOne-Users",
    "arn:aws:s3:::capitalone-statements-*/*"
  ]
}
```

---

## Environment Variables

### sendNotification Lambda
- `SENDER_EMAIL` - Verified SES sender email

### generateStatement Lambda
- `DYNAMODB_TABLE_NAME` - CapitalOne-Users
- `S3_BUCKET_NAME` - capitalone-statements-{id}

### getStatement Lambda (On-demand)
- `DYNAMODB_TABLE_NAME` - CapitalOne-Users
- `S3_BUCKET_NAME` - capitalone-statements-{id}

### transactionService Lambda (Updated)
- `DYNAMODB_TABLE_NAME` - CapitalOne-Users
- `SNS_TOPIC_ARN` - arn:aws:sns:us-east-1:*:CapitalOne-Transactions

---

## API Endpoints (New)

| Method | Path | Lambda | Description |
|--------|------|--------|-------------|
| GET | `/statements/{userId}` | getStatement | Generates a fresh statement on-demand and returns a pre-signed S3 URL |

---

## Testing Checklist

- [ ] Create user with email notifications enabled
- [ ] Make transaction → verify email received
- [ ] Click "Download Statement" immediately after a transaction and confirm the statement reflects the latest balance/transactions
- [ ] (Optional) Trigger monthly statement generation manually for all users
- [ ] (Optional) Verify EventBridge rule triggers on schedule

---

## Cost Analysis (Free Tier)

| Service | Free Tier Limit | Expected Usage |
|---------|-----------------|----------------|
| SNS | 1M publishes/month | <100 |
| SES | 62K emails/month | <100 |
| S3 | 5GB storage | <1MB |
| EventBridge | Unlimited rules | 1 rule |
| Lambda | 1M requests | <1000 |

**Total Cost: $0.00**

---

## Step-by-Step Deployment Guide

### Prerequisites
- AWS CLI configured with credentials
- Node.js 18+ installed
- Existing midterm infrastructure (DynamoDB, API Gateway, Lambda role)

### Step 1: Verify Email in SES
```bash
cd scripts
chmod +x *.sh
./setup-ses.sh your-email@example.com
```
- Check your email and click the verification link
- For testing, also verify recipient emails (SES sandbox mode)

### Step 2: Create S3 Bucket
```bash
./setup-s3-statements.sh
```
- Note the bucket name from output

### Step 3: Create SNS Topic
```bash
./setup-sns.sh
```
- Note the Topic ARN from output

### Step 4: Update IAM Role
- Go to AWS Console → IAM → Roles → CapitalOne-Lambda-Role
- Attach the policy from `iam/final-lambda-policy.json`
- Or create inline policy with the JSON content

### Step 5: Deploy New Lambda Functions
```bash
# Deploy sendNotification
./deploy-sendNotification.sh

# Deploy generateStatement
./deploy-generateStatement.sh

# Deploy getStatement
./deploy-getStatement.sh
```

### Step 6: Subscribe sendNotification to SNS
```bash
# Get the ARNs from config files
cat ../config/sns-config.env
cat ../config/ses-config.env

# Subscribe Lambda to SNS topic
aws sns subscribe \
  --topic-arn <TOPIC_ARN> \
  --protocol lambda \
  --notification-endpoint arn:aws:lambda:us-east-1:<ACCOUNT_ID>:function:sendNotification \
  --region us-east-1
```

### Step 7: Update transactionService Lambda
```bash
./update-transactionService.sh
```

### Step 8: Setup EventBridge Rule (Optional)
```bash
# Get generateStatement Lambda ARN
LAMBDA_ARN=$(aws lambda get-function --function-name generateStatement --query 'Configuration.FunctionArn' --output text)

./setup-eventbridge.sh $LAMBDA_ARN
```

### Step 9: Add API Gateway Route
- Go to AWS Console → API Gateway → Your API
- Create route: `GET /statements/{userId}`
- Integration: Lambda function `getStatement`
- Deploy the API

### Step 10: Update Frontend
```bash
git add .
git commit -m "Add notification and statement features"
git push origin main
```
- Amplify will auto-deploy

### Step 11: Test the System
1. Create a new user with email notifications enabled
2. Make a transaction (deposit/withdrawal)
3. Check your email for notification
4. Click "Download Statement" in the app and confirm it opens an HTML statement that reflects the latest transaction
5. (Optional) Manually trigger bulk monthly generation:
   ```bash
   aws lambda invoke --function-name generateStatement /dev/stdout
   ```

---

## Troubleshooting

### Email not received
- Check SES sandbox mode - verify recipient email
- Check CloudWatch logs for sendNotification Lambda
- Verify SNS subscription is confirmed

### Statement download fails
- Check S3 bucket exists and has statements
- Verify getStatement Lambda has S3 permissions
- Check API Gateway route is configured

### SNS not publishing
- Verify SNS_TOPIC_ARN environment variable in transactionService
- Check IAM role has sns:Publish permission
- Check CloudWatch logs for errors

---

## Changelog

### 2024-12-04
- Initial final project implementation
- Added SNS, SES, S3, EventBridge services
- Created sendNotification, generateStatement, getStatement Lambdas
- Updated transactionService to publish to SNS
- Updated frontend with notification preferences and statement download
- Created deployment scripts for all new services
- Added comprehensive IAM policy for new permissions
