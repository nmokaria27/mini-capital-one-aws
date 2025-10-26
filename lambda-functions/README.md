# Lambda Functions

## createUser
**Purpose**: Create new user accounts and store in DynamoDB

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
  "message": "User created successfully",
  "userId": "uuid-here",
  "balance": 1000.00
}
```

**Environment Variables**:
- `DYNAMODB_TABLE_NAME`: Name of DynamoDB table

---

## transactionService
**Purpose**: Process transactions, update DynamoDB balance, record in Aurora RDS

**Input**:
```json
{
  "userId": "uuid-here",
  "transactionType": "deposit",
  "amount": 500.00
}
```

**Output**:
```json
{
  "message": "Transaction successful",
  "transactionType": "deposit",
  "amount": 500.00,
  "newBalance": 1500.00
}
```

**Environment Variables**:
- `DYNAMODB_TABLE_NAME`: Name of DynamoDB table
- `RDS_HOST`: Aurora RDS endpoint
- `RDS_USER`: Database username
- `RDS_PASSWORD`: Database password
- `RDS_DATABASE`: Database name

---

## Deployment
1. Navigate to function directory
2. Run `npm install`
3. Zip contents: `zip -r function.zip .`
4. Upload to AWS Lambda
5. Configure environment variables
6. Set up IAM role with appropriate permissions
7. Configure VPC (for transactionService to access RDS)
