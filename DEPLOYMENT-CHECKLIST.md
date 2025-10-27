# Deployment Checklist - Capital One Banking App

## ✅ What's Already Done (Per instructions.md)

- [x] DynamoDB table `CapitalOne-Users` created
- [x] IAM role `CapitalOneLambdaRole` created
- [x] API Gateway HTTP API created with base URL: `https://y85zq1ex6c.execute-api.us-east-1.amazonaws.com`
- [x] Route `POST /users` → `createUser` Lambda configured
- [x] Amplify hosting connected to GitHub: `https://main.d39rly73pvywwe.amplifyapp.com`
- [x] Frontend `app.js` correctly points to API Gateway
- [x] `amplify.yml` configured with correct `baseDirectory: frontend`

## 🔴 Critical Fixes Required

### 1. Update Lambda Functions to Match Instructions

**Current Issue**: Lambda functions use CommonJS (`.js` with `require`)
**Required**: ES modules (`.mjs` with `import`)

**Action**:
```bash
# Deploy the NEW lambdas/ folder (not lambda-functions/)
cd lambdas/createUser
npm install
zip -r createUser.zip .

# Upload to Lambda console:
# - Go to Lambda → createUser → Code tab → Upload from → .zip file
# - Select createUser.zip
# - Verify Handler is set to: index.handler
# - Verify Runtime is: Node.js 18.x
```

Repeat for `transactionService` after RDS is set up.

### 2. Verify API Gateway Field Mapping

**Frontend sends**: `type: "DEPOSIT"` or `type: "WITHDRAW"`
**Old Lambda expected**: `transactionType: "deposit"` ❌
**New Lambda expects**: `type: "DEPOSIT"` ✅

✅ **Fixed** in new `lambdas/transactionService/index.mjs`

### 3. Add Transaction ID to Response

**Old Lambda**: No `transactionId` in response
**New Lambda**: Returns `{ balance: 1500, transactionId: "uuid" }` ✅

✅ **Fixed** in new `lambdas/transactionService/index.mjs`

---

## 🚧 Teammate B - TO DO (Transactions)

### B1: Create RDS MySQL Free Tier Instance

1. **RDS Console** → Create database
   - Engine: MySQL
   - Template: **Free tier**
   - DB instance class: `db.t3.micro`
   - Storage: 20 GB (free tier)
   - **Public access**: No
   - VPC: Default VPC
   - Security group: Create new or use existing
   - Initial database name: `capitalone_banking`
   - Master username: `admin`
   - Master password: (save this!)

2. **Wait for "Available" status** (5-10 minutes)

3. **Note the endpoint**: e.g., `capitalone-db.abc123.us-east-1.rds.amazonaws.com`

### B2: Create Database Schema

**Option 1 - Query Editor v2** (easiest):
1. RDS Console → Query Editor v2
2. Connect to your RDS instance
3. Run the SQL from `database/mysql-transactions.sql`

**Option 2 - MySQL Client**:
```bash
mysql -h <your-rds-endpoint> -u admin -p
# Enter password
# Then paste contents of database/mysql-transactions.sql
```

### B3: Store RDS Credentials in Secrets Manager

1. **Secrets Manager** → Store new secret
2. Secret type: **Credentials for RDS database**
3. Select your RDS instance
4. Secret name: `capitalone/rds/mysql`
5. **Copy the Secret ARN** (you'll need this for Lambda env vars)

Example ARN: `arn:aws:secretsmanager:us-east-1:123456789012:secret:capitalone/rds/mysql-AbCdEf`

### B4: Update IAM Role for transactionService

Add these policies to `CapitalOneLambdaRole`:

**Secrets Manager Access**:
```json
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
```

**VPC Access** (if not already attached):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:CreateNetworkInterface",
        "ec2:DescribeNetworkInterfaces",
        "ec2:DeleteNetworkInterface"
      ],
      "Resource": "*"
    }
  ]
}
```

### B5: Deploy transactionService Lambda

```bash
cd lambdas/transactionService
npm install
zip -r transactionService.zip .
```

**Lambda Configuration**:
- Runtime: Node.js 18.x
- Handler: `index.handler`
- Role: `CapitalOneLambdaRole`
- Timeout: 30 seconds (RDS connections can be slow)

**Environment Variables**:
```
DYNAMODB_TABLE_NAME=CapitalOne-Users
DB_SECRET_ARN=arn:aws:secretsmanager:us-east-1:...:secret:capitalone/rds/mysql-...
DB_HOST=<your-rds-endpoint>
DB_NAME=capitalone_banking
```

**VPC Configuration**:
- VPC: Same as RDS
- Subnets: Select at least 2 private subnets
- Security group: Create new or use one that can reach RDS

### B6: Configure Security Groups

**Lambda Security Group** (outbound):
- Type: MySQL/Aurora
- Protocol: TCP
- Port: 3306
- Destination: RDS security group ID

**RDS Security Group** (inbound):
- Type: MySQL/Aurora
- Protocol: TCP
- Port: 3306
- Source: Lambda security group ID

### B7: Add API Gateway Route

1. API Gateway Console → Your HTTP API
2. Routes → Create
3. Method: `POST`
4. Path: `/transactions`
5. Integration: `transactionService` Lambda
6. Deploy (should auto-deploy to `$default` stage)

### B8: Test End-to-End

**Test 1 - Create User**:
```bash
curl -X POST "https://y85zq1ex6c.execute-api.us-east-1.amazonaws.com/users" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User","dob":"2000-01-01","email":"test@example.com","initialBalance":100}'
```

Expected: `{"userId":"...","balance":100}`

**Test 2 - Deposit**:
```bash
curl -X POST "https://y85zq1ex6c.execute-api.us-east-1.amazonaws.com/transactions" \
  -H "Content-Type: application/json" \
  -d '{"userId":"<userId-from-test-1>","type":"DEPOSIT","amount":50}'
```

Expected: `{"balance":150,"transactionId":"..."}`

**Test 3 - Verify Data**:
- DynamoDB: Check `CapitalOne-Users` table → balance should be 150
- RDS: Query `SELECT * FROM transactions;` → should have 1 row

**Test 4 - Frontend**:
1. Open `https://main.d39rly73pvywwe.amplifyapp.com`
2. Create account → should work
3. Make transaction → should work
4. Check browser console (F12) for any errors

---

## 📋 Verification Checklist

- [ ] `createUser` Lambda uses ES modules (`.mjs`)
- [ ] `transactionService` Lambda uses ES modules (`.mjs`)
- [ ] RDS MySQL instance is running
- [ ] Database `capitalone_banking` and table `transactions` exist
- [ ] Secrets Manager has RDS credentials
- [ ] `CapitalOneLambdaRole` has Secrets Manager and VPC permissions
- [ ] `transactionService` Lambda is in VPC with correct security groups
- [ ] API Gateway has `POST /transactions` route
- [ ] Frontend can create users successfully
- [ ] Frontend can make transactions successfully
- [ ] DynamoDB shows updated balance after transaction
- [ ] RDS shows transaction record

---

## 🐛 Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Lambda timeout | VPC networking | Ensure Lambda SG can reach RDS SG on port 3306 |
| `ER_ACCESS_DENIED_ERROR` | Wrong DB credentials | Check Secrets Manager secret content |
| `ConditionalCheckFailed` | Race condition | This is expected behavior; frontend should retry |
| 404 on `/transactions` | Route not created | Add route in API Gateway and deploy |
| CORS error | Missing CORS config | API Gateway → CORS → Add Amplify origin |
| No transaction in RDS | Connection failed | Check CloudWatch logs for connection errors |

---

## 💰 Cost Control

- **Stop RDS when not testing**: RDS Console → Actions → Stop temporarily (7 days max)
- **Set billing alert**: $1/month budget
- **Free tier usage**:
  - Lambda: 1M requests/month free
  - API Gateway: 1M requests/month free (HTTP API)
  - DynamoDB: 25 GB storage + 25 WCU/RCU free
  - RDS: 750 hours/month `db.t3.micro` free

---

## 📝 Summary

**What's working**:
- ✅ Frontend hosted on Amplify
- ✅ API Gateway configured
- ✅ User creation flow (needs Lambda update)
- ✅ DynamoDB table

**What needs work**:
- 🔴 Update Lambda functions to ES modules
- 🔴 Set up RDS MySQL
- 🔴 Configure Secrets Manager
- 🔴 Deploy transactionService Lambda with VPC
- 🔴 Add `/transactions` API route
- 🔴 Test end-to-end

**Estimated time**: 2-3 hours for Teammate B to complete transactions setup.
