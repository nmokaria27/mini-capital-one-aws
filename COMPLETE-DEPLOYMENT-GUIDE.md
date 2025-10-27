# Complete Deployment Guide - Capital One Banking App

## 📊 Current Status

### ✅ Already Deployed (Working)
- **User Creation**: Lambda deployed, API Gateway route configured
- **DynamoDB**: `CapitalOne-Users` table created
- **Frontend**: Hosted on Amplify at `https://main.d39rly73pvywwe.amplifyapp.com`
- **API Gateway**: Base URL `https://wmg52t8w3j.execute-api.us-east-1.amazonaws.com`
- **IAM Role**: `CapitalOneLambdaRole` with DynamoDB permissions

### 🔴 Missing Components (To Deploy)
1. **RDS MySQL** - Database for transaction history
2. **Secrets Manager** - Store RDS credentials securely
3. **Transaction Service Lambda** - Process deposits/withdrawals
4. **Balance Check Lambda** - Retrieve user balance
5. **API Gateway Routes** - `/transactions` and `/users/{userId}`

---

## 🚀 Step-by-Step Deployment

### Step 1: Create RDS MySQL Instance (Free Tier)

**Time**: ~10 minutes

1. **Go to RDS Console** → Create database
   - Engine: **MySQL**
   - Template: **Free tier**
   - DB instance identifier: `capitalone-banking-db`
   - Master username: `admin`
   - Master password: (create a strong password and save it!)
   - DB instance class: `db.t3.micro` (free tier eligible)
   - Storage: 20 GB (free tier)
   - **Public access**: No
   - VPC: Default VPC
   - Create new security group: `capitalone-rds-sg`
   - Initial database name: `capitalone_banking`

2. **Wait for "Available" status** (~5-10 minutes)

3. **Note the endpoint**: 
   - Go to RDS → Databases → `capitalone-banking-db`
   - Copy the **Endpoint** (e.g., `capitalone-banking-db.abc123.us-east-1.rds.amazonaws.com`)

---

### Step 2: Create Database Schema

**Option A - Query Editor v2** (Easiest):
1. RDS Console → Query Editor v2
2. Connect to your RDS instance using master credentials
3. Run the SQL from `database/aurora-schema.sql`:

```sql
CREATE DATABASE IF NOT EXISTS capitalone_banking;
USE capitalone_banking;

CREATE TABLE IF NOT EXISTS transactions (
    transaction_id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    transaction_type VARCHAR(10) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    balance_after DECIMAL(12, 2) NOT NULL,
    transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_transactions (user_id, transaction_date DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Option B - MySQL Client**:
```bash
mysql -h <your-rds-endpoint> -u admin -p < database/aurora-schema.sql
```

---

### Step 3: Store RDS Credentials in Secrets Manager

1. **Go to Secrets Manager** → Store a new secret
2. Secret type: **Credentials for RDS database**
3. Select your RDS instance: `capitalone-banking-db`
4. Secret name: `capitalone/rds/mysql`
5. Click **Next** → **Next** → **Store**
6. **Copy the Secret ARN** (you'll need this!)
   - Example: `arn:aws:secretsmanager:us-east-1:123456789012:secret:capitalone/rds/mysql-AbCdEf`

---

### Step 4: Update IAM Role Permissions

Add Secrets Manager access to `CapitalOneLambdaRole`:

```bash
# Create policy document
cat > /tmp/secrets-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "arn:aws:secretsmanager:us-east-1:*:secret:capitalone/rds/mysql-*"
    }
  ]
}
EOF

# Attach policy to role
aws iam put-role-policy \
  --role-name CapitalOneLambdaRole \
  --policy-name SecretsManagerAccess \
  --policy-document file:///tmp/secrets-policy.json \
  --region us-east-1
```

---

### Step 5: Deploy Transaction Service Lambda

**Set environment variables first**:
```bash
export DB_SECRET_ARN="arn:aws:secretsmanager:us-east-1:YOUR_ACCOUNT:secret:capitalone/rds/mysql-XXXXX"
export DB_HOST="your-rds-endpoint.rds.amazonaws.com"
```

**Deploy**:
```bash
./scripts/deploy-transactionService.sh
```

**Configure VPC** (Manual step required):
1. Go to Lambda Console → `transactionService` → Configuration → VPC
2. Edit VPC settings:
   - VPC: Same as RDS (Default VPC)
   - Subnets: Select at least 2 subnets
   - Security group: Create new or select existing

**Configure Security Groups**:
1. **Lambda Security Group** (outbound):
   - Type: MySQL/Aurora
   - Protocol: TCP
   - Port: 3306
   - Destination: RDS security group ID

2. **RDS Security Group** (inbound):
   - Type: MySQL/Aurora
   - Protocol: TCP
   - Port: 3306
   - Source: Lambda security group ID

---

### Step 6: Deploy Balance Check Lambda

```bash
./scripts/deploy-getBalance.sh
```

This Lambda doesn't need VPC access since it only reads from DynamoDB.

---

### Step 7: Add API Gateway Routes

**Add POST /transactions route**:
```bash
# Get API ID
API_ID=$(aws apigatewayv2 get-apis --region us-east-1 --query "Items[?Name=='CapitalOne-Banking-API'].ApiId" --output text)

# Get Lambda ARN
TXN_LAMBDA_ARN=$(aws lambda get-function --function-name transactionService --region us-east-1 --query 'Configuration.FunctionArn' --output text)

# Create integration
TXN_INTEGRATION_ID=$(aws apigatewayv2 create-integration \
  --api-id $API_ID \
  --integration-type AWS_PROXY \
  --integration-uri $TXN_LAMBDA_ARN \
  --payload-format-version 2.0 \
  --region us-east-1 \
  --query 'IntegrationId' \
  --output text)

# Create route
aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key "POST /transactions" \
  --target "integrations/$TXN_INTEGRATION_ID" \
  --region us-east-1

# Add Lambda permission
aws lambda add-permission \
  --function-name transactionService \
  --statement-id apigateway-invoke-transactions \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:$(aws sts get-caller-identity --query Account --output text):$API_ID/*/*/transactions" \
  --region us-east-1
```

**Add GET /users/{userId} route**:
```bash
# Get Lambda ARN
BALANCE_LAMBDA_ARN=$(aws lambda get-function --function-name getBalance --region us-east-1 --query 'Configuration.FunctionArn' --output text)

# Create integration
BALANCE_INTEGRATION_ID=$(aws apigatewayv2 create-integration \
  --api-id $API_ID \
  --integration-type AWS_PROXY \
  --integration-uri $BALANCE_LAMBDA_ARN \
  --payload-format-version 2.0 \
  --region us-east-1 \
  --query 'IntegrationId' \
  --output text)

# Create route
aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key "GET /users/{userId}" \
  --target "integrations/$BALANCE_INTEGRATION_ID" \
  --region us-east-1

# Add Lambda permission
aws lambda add-permission \
  --function-name getBalance \
  --statement-id apigateway-invoke-balance \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:$(aws sts get-caller-identity --query Account --output text):$API_ID/*/*/users/*" \
  --region us-east-1
```

---

### Step 8: Deploy Updated Frontend

The frontend has been updated with balance check functionality. Push to GitHub:

```bash
git add .
git commit -m "Complete transaction and balance check implementation"
git push origin main
```

Amplify will automatically deploy the updated frontend.

---

## 🧪 Testing

### Test 1: Create User
```bash
curl -X POST "https://wmg52t8w3j.execute-api.us-east-1.amazonaws.com/users" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"John Doe","dob":"1990-05-15","email":"john@example.com","initialBalance":1000}'
```

**Expected**: `{"userId":"<uuid>","balance":1000}`

### Test 2: Check Balance
```bash
# Replace <userId> with actual UUID from Test 1
curl -X GET "https://wmg52t8w3j.execute-api.us-east-1.amazonaws.com/users/<userId>"
```

**Expected**: `{"userId":"<uuid>","fullName":"John Doe","email":"john@example.com","balance":1000,"updatedAt":"..."}`

### Test 3: Make Deposit
```bash
curl -X POST "https://wmg52t8w3j.execute-api.us-east-1.amazonaws.com/transactions" \
  -H "Content-Type: application/json" \
  -d '{"userId":"<userId>","type":"DEPOSIT","amount":500}'
```

**Expected**: `{"balance":1500,"transactionId":"<uuid>"}`

### Test 4: Make Withdrawal
```bash
curl -X POST "https://wmg52t8w3j.execute-api.us-east-1.amazonaws.com/transactions" \
  -H "Content-Type: application/json" \
  -d '{"userId":"<userId>","type":"WITHDRAW","amount":200}'
```

**Expected**: `{"balance":1300,"transactionId":"<uuid>"}`

### Test 5: Verify in Databases

**DynamoDB**:
```bash
aws dynamodb get-item \
  --table-name CapitalOne-Users \
  --key '{"userId":{"S":"<userId>"}}' \
  --region us-east-1
```

**RDS** (Query Editor v2):
```sql
SELECT * FROM transactions WHERE user_id = '<userId>' ORDER BY transaction_date DESC;
```

---

## 🎯 Architecture Summary

```
┌─────────────────┐
│   Amplify       │  Frontend (Static Website)
│   Frontend      │  https://main.d39rly73pvywwe.amplifyapp.com
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Gateway    │  HTTP API
│  (us-east-1)    │  https://wmg52t8w3j.execute-api.us-east-1.amazonaws.com
└────────┬────────┘
         │
         ├─── POST /users ──────────────► createUser Lambda ──────► DynamoDB
         │                                                           (CapitalOne-Users)
         │
         ├─── GET /users/{userId} ─────► getBalance Lambda ────────► DynamoDB
         │
         └─── POST /transactions ──────► transactionService Lambda ─┬─► DynamoDB (update balance)
                                                                     └─► RDS MySQL (insert transaction)
```

---

## 💰 Cost Tracking

### Free Tier Usage:
- **API Gateway**: 1M requests/month (free)
- **Lambda**: 1M requests + 400,000 GB-seconds/month (free)
- **DynamoDB**: 25 GB storage + 25 WCU + 25 RCU (free)
- **RDS MySQL**: db.t3.micro 750 hours/month (free for 12 months)
- **Amplify**: 1000 build minutes + 15 GB served/month (free)
- **Secrets Manager**: First 30 days free, then $0.40/month per secret

### Monthly Cost Estimate:
- **If within free tier**: $0.40 (Secrets Manager only)
- **After free tier**: ~$15-20/month (mostly RDS)

### Cost Saving Tips:
1. **Stop RDS when not testing**: RDS Console → Actions → Stop
2. **Delete test data**: Keep DynamoDB items minimal
3. **Set billing alerts**: AWS Budgets → Create $1 monthly budget

---

## 🐛 Troubleshooting

### Issue: Lambda timeout connecting to RDS
**Cause**: VPC/Security group misconfiguration
**Fix**: 
1. Ensure Lambda is in same VPC as RDS
2. Check security group rules (Lambda SG → RDS SG:3306)
3. Verify subnets have route to NAT Gateway (for internet access)

### Issue: "ER_ACCESS_DENIED_ERROR"
**Cause**: Wrong DB credentials in Secrets Manager
**Fix**: 
1. Go to Secrets Manager → Edit secret
2. Verify username, password, host, port, dbname
3. Update Lambda to pick up new secret

### Issue: CORS error from frontend
**Cause**: API Gateway CORS not configured
**Fix**:
```bash
aws apigatewayv2 update-api \
  --api-id $API_ID \
  --cors-configuration "AllowOrigins=https://main.d39rly73pvywwe.amplifyapp.com,AllowMethods=GET,POST,OPTIONS,AllowHeaders=Content-Type,Accept" \
  --region us-east-1
```

### Issue: Transaction returns 500 error
**Cause**: Missing transaction_id column or wrong data type
**Fix**: Drop and recreate table with correct schema from `database/aurora-schema.sql`

---

## 📚 Additional Resources

- **AWS Free Tier**: https://aws.amazon.com/free/
- **RDS Free Tier**: https://aws.amazon.com/rds/free/
- **Lambda VPC Configuration**: https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html
- **API Gateway HTTP API**: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html

---

## ✅ Completion Checklist

- [ ] RDS MySQL instance created and available
- [ ] Database schema created (`transactions` table)
- [ ] Secrets Manager configured with RDS credentials
- [ ] IAM role updated with Secrets Manager permissions
- [ ] transactionService Lambda deployed with VPC
- [ ] getBalance Lambda deployed
- [ ] Security groups configured (Lambda ↔ RDS)
- [ ] API Gateway routes added (POST /transactions, GET /users/{userId})
- [ ] Frontend updated and deployed to Amplify
- [ ] All endpoints tested successfully
- [ ] DynamoDB balance updates verified
- [ ] RDS transaction records verified
- [ ] Billing alerts configured

---

## 🎉 You're Done!

Your Capital One Banking App is now fully functional with:
- ✅ User account creation
- ✅ Balance checking
- ✅ Deposits and withdrawals
- ✅ Transaction history in RDS
- ✅ Real-time balance updates in DynamoDB

**Remember to stop your RDS instance when not testing to avoid charges!**
