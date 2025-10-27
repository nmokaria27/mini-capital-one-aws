# Lambda Functions (ES Modules - Node 18)

## Directory Structure
```
lambdas/
├── createUser/
│   ├── index.mjs
│   └── package.json
└── transactionService/
    ├── index.mjs
    └── package.json
```

## createUser Lambda

**Purpose**: Create new user accounts and store in DynamoDB

**Runtime**: Node.js 18 (ES modules)

**Input**:
```json
{
  "fullName": "John Doe",
  "dob": "1990-05-15",
  "email": "john.doe@example.com",
  "initialBalance": 1000.00
}
```

**Output**:
```json
{
  "userId": "uuid-here",
  "balance": 1000.00
}
```

**Environment Variables**:
- `DYNAMODB_TABLE_NAME`: Name of DynamoDB table (e.g., `CapitalOne-Users`)

**Deployment**:
```bash
cd lambdas/createUser
npm install
zip -r createUser.zip .
# Upload to Lambda console or use AWS CLI
```

---

## transactionService Lambda

**Purpose**: Process transactions, update DynamoDB balance atomically, record in RDS

**Runtime**: Node.js 18 (ES modules)

**Input**:
```json
{
  "userId": "uuid-here",
  "type": "DEPOSIT",
  "amount": 500.00
}
```

**Output**:
```json
{
  "balance": 1500.00,
  "transactionId": "uuid-here"
}
```

**Environment Variables**:
- `DYNAMODB_TABLE_NAME`: Name of DynamoDB table
- `DB_SECRET_ARN`: ARN of Secrets Manager secret containing RDS credentials
- `DB_HOST`: RDS endpoint (optional, can be in secret)
- `DB_NAME`: Database name (e.g., `capitalone_banking`)

**VPC Configuration**:
- Must be in same VPC as RDS
- Security group must allow outbound to RDS on port 3306
- RDS security group must allow inbound from Lambda security group

**Deployment**:
```bash
cd lambdas/transactionService
npm install
zip -r transactionService.zip .
# Upload to Lambda console or use AWS CLI
```

---

## Key Differences from Old Implementation

1. **ES Modules**: Uses `import` instead of `require`
2. **AWS SDK v3**: Uses modular `@aws-sdk/client-*` packages
3. **Atomic Updates**: Uses `ConditionExpression` to prevent race conditions
4. **Secrets Manager**: Fetches DB credentials securely
5. **Transaction ID**: Returns UUID for each transaction
6. **Field Names**: Uses `type` (not `transactionType`) with uppercase values

---

## IAM Permissions Required

**createUser**:
- `dynamodb:PutItem` on `CapitalOne-Users` table
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`

**transactionService**:
- `dynamodb:GetItem`, `dynamodb:UpdateItem` on `CapitalOne-Users` table
- `secretsmanager:GetSecretValue` on RDS secret
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`
- VPC permissions: `ec2:CreateNetworkInterface`, `ec2:DescribeNetworkInterfaces`, `ec2:DeleteNetworkInterface`
