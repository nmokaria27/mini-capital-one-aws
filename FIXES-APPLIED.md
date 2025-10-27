# Fixes Applied to Match instructions.md

## Overview
This document summarizes all changes made to align the codebase with the requirements in `instructions.md`.

---

## ✅ Fixed Issues

### 1. Lambda Code Format
**Problem**: Old lambdas used CommonJS (`.js` with `require`)
**Solution**: Created new `lambdas/` folder with ES modules (`.mjs` with `import`)

**Files Created**:
- `lambdas/createUser/index.mjs` - ES module version
- `lambdas/createUser/package.json` - Updated with `"type": "module"`
- `lambdas/transactionService/index.mjs` - ES module version
- `lambdas/transactionService/package.json` - Updated with `"type": "module"`

**Key Changes**:
```javascript
// OLD (CommonJS)
const AWS = require('aws-sdk');
exports.handler = async (event) => { ... }

// NEW (ES Modules)
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
export const handler = async (event) => { ... }
```

---

### 2. Transaction Field Names
**Problem**: Lambda expected `transactionType: "deposit"/"withdrawal"`
**Solution**: Updated to expect `type: "DEPOSIT"/"WITHDRAW"`

**Before**:
```javascript
const { userId, transactionType, amount } = body;
if (transactionType === 'deposit') { ... }
```

**After**:
```javascript
const { userId, type, amount } = body;
if (!["DEPOSIT","WITHDRAW"].includes(type)) { ... }
```

---

### 3. Missing Transaction ID
**Problem**: Response didn't include `transactionId`
**Solution**: Generate UUID and return it

**Before**:
```javascript
return {
  statusCode: 200,
  body: JSON.stringify({
    message: 'Transaction successful',
    newBalance: newBalance
  })
};
```

**After**:
```javascript
const txnId = uuidv4();
// ... insert with txnId ...
return {
  statusCode: 200,
  body: JSON.stringify({
    balance: newBal,
    transactionId: txnId
  })
};
```

---

### 4. Secrets Manager Integration
**Problem**: DB credentials hardcoded in env vars
**Solution**: Fetch from Secrets Manager

**Before**:
```javascript
const dbConfig = {
  host: process.env.RDS_HOST,
  user: process.env.RDS_USER,
  password: process.env.RDS_PASSWORD,
  database: process.env.RDS_DATABASE
};
```

**After**:
```javascript
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

async function getConn() {
  const sec = await sm.send(new GetSecretValueCommand({ 
    SecretId: process.env.DB_SECRET_ARN 
  }));
  const { username, password, host } = JSON.parse(sec.SecretString);
  return mysql.createConnection({ host, user: username, password, ... });
}
```

---

### 5. Atomic Updates with Condition
**Problem**: Simple update without race condition protection
**Solution**: Added `ConditionExpression` to ensure balance hasn't changed

**Before**:
```javascript
await dynamodb.update({
  TableName: process.env.DYNAMODB_TABLE_NAME,
  Key: { userId },
  UpdateExpression: 'SET balance = :newBalance'
});
```

**After**:
```javascript
await ddb.send(new UpdateItemCommand({
  TableName: process.env.DYNAMODB_TABLE_NAME,
  Key: { userId: { S: userId } },
  UpdateExpression: "SET balance = :b, updatedAt = :u",
  ConditionExpression: "balance = :old",  // ← Prevents race conditions
  ExpressionAttributeValues: {
    ":b": { N: newBal.toFixed(2) },
    ":old": { N: current.toFixed(2) }
  }
}));
```

---

### 6. AWS SDK v3 Migration
**Problem**: Used old AWS SDK v2
**Solution**: Migrated to modular AWS SDK v3

**Before**:
```javascript
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
```

**After**:
```javascript
import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
const ddb = new DynamoDBClient({});
```

**Benefits**:
- Smaller bundle size (only import what you need)
- Better tree-shaking
- Modern Promise-based API
- Better TypeScript support

---

### 7. SQL Schema File
**Problem**: Old schema used `transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
**Solution**: Created correct schema matching instructions

**File**: `database/mysql-transactions.sql`

**Key Points**:
- Primary key: `transaction_id` (VARCHAR(36) for UUID)
- Index on `(user_id, transaction_date DESC)` for fast queries
- `transaction_type` stores uppercase values: `DEPOSIT`/`WITHDRAW`

---

### 8. Response Format Consistency
**Problem**: Inconsistent response formats
**Solution**: Standardized to match instructions

**createUser Response**:
```json
{
  "userId": "uuid",
  "balance": 100
}
```

**transactionService Response**:
```json
{
  "balance": 150,
  "transactionId": "uuid"
}
```

---

## 📁 File Structure Changes

### New Files Created:
```
lambdas/                          ← NEW (ES modules)
├── createUser/
│   ├── index.mjs                 ← NEW
│   └── package.json              ← NEW
├── transactionService/
│   ├── index.mjs                 ← NEW
│   └── package.json              ← NEW
└── README.md                     ← NEW

database/
└── mysql-transactions.sql        ← UPDATED

DEPLOYMENT-CHECKLIST.md           ← NEW
FIXES-APPLIED.md                  ← NEW (this file)
```

### Old Files (Keep for Reference):
```
lambda-functions/                 ← OLD (CommonJS, keep for backup)
├── createUser/
│   ├── index.js                  ← OLD
│   └── package.json              ← OLD
└── transactionService/
    ├── index.js                  ← OLD
    └── package.json              ← OLD
```

---

## 🚀 Deployment Instructions

### For createUser Lambda:
```bash
cd lambdas/createUser
npm install
zip -r createUser.zip .
# Upload to Lambda console
# Set Handler: index.handler
# Set Runtime: Node.js 18.x
```

### For transactionService Lambda:
```bash
cd lambdas/transactionService
npm install
zip -r transactionService.zip .
# Upload to Lambda console
# Set Handler: index.handler
# Set Runtime: Node.js 18.x
# Configure VPC, Security Groups, and Environment Variables
```

---

## ✅ Verification

### Test createUser:
```bash
curl -X POST "https://y85zq1ex6c.execute-api.us-east-1.amazonaws.com/users" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test","dob":"2000-01-01","email":"t@e.com","initialBalance":100}'
```

Expected: `{"userId":"...","balance":100}`

### Test transactionService:
```bash
curl -X POST "https://y85zq1ex6c.execute-api.us-east-1.amazonaws.com/transactions" \
  -H "Content-Type: application/json" \
  -d '{"userId":"<uuid>","type":"DEPOSIT","amount":50}'
```

Expected: `{"balance":150,"transactionId":"..."}`

---

## 📊 Comparison Table

| Feature | Old Implementation | New Implementation | Status |
|---------|-------------------|-------------------|--------|
| Module System | CommonJS (`.js`) | ES Modules (`.mjs`) | ✅ Fixed |
| AWS SDK | v2 (monolithic) | v3 (modular) | ✅ Fixed |
| Transaction Field | `transactionType` | `type` | ✅ Fixed |
| Transaction Values | lowercase | UPPERCASE | ✅ Fixed |
| Transaction ID | Missing | UUID returned | ✅ Fixed |
| DB Credentials | Env vars | Secrets Manager | ✅ Fixed |
| Race Conditions | Possible | Prevented with condition | ✅ Fixed |
| Response Format | Inconsistent | Standardized | ✅ Fixed |

---

## 🎯 Next Steps

1. **Deploy new Lambda functions** from `lambdas/` folder
2. **Set up RDS MySQL** (see DEPLOYMENT-CHECKLIST.md)
3. **Configure Secrets Manager** for DB credentials
4. **Update IAM role** with Secrets Manager permissions
5. **Configure VPC** for transactionService Lambda
6. **Add API Gateway route** for `/transactions`
7. **Test end-to-end** from Amplify frontend

---

## 📝 Notes

- **Old `lambda-functions/` folder**: Keep for reference but don't deploy
- **Frontend `app.js`**: Already correct, no changes needed
- **API Gateway**: Already configured correctly
- **Amplify**: Already configured correctly
- **DynamoDB**: Already configured correctly

**All fixes are backward compatible with the frontend!** The frontend already sends the correct format.
