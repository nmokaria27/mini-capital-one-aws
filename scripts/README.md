# Deployment Scripts

Automate AWS configuration using AWS CLI.

## Prerequisites

```bash
# Install AWS CLI
brew install awscli  # macOS
# or: pip install awscli

# Configure credentials
aws configure
# Enter: Access Key ID, Secret Access Key, Region (us-east-1), Output format (json)
```

## Quick Start (Automated)

Deploy everything with one command:

```bash
chmod +x scripts/deploy-all.sh
./scripts/deploy-all.sh
```

This will:
1. ✅ Create IAM role with all permissions
2. ✅ Create DynamoDB table
3. ✅ Deploy createUser Lambda
4. ✅ Setup API Gateway with routes

**Time**: ~2-3 minutes

---

## Individual Scripts (Manual Control)

### 1. Setup IAM Role
```bash
./scripts/setup-iam.sh
```
Creates `CapitalOneLambdaRole` with DynamoDB, CloudWatch, VPC, and Secrets Manager permissions.

### 2. Setup DynamoDB
```bash
./scripts/setup-dynamodb.sh
```
Creates `CapitalOne-Users` table with on-demand billing.

### 3. Deploy createUser Lambda
```bash
./scripts/deploy-createUser.sh
```
Packages and deploys the createUser Lambda function.

### 4. Setup API Gateway
```bash
./scripts/setup-api-gateway.sh
```
Creates HTTP API with routes:
- `POST /users` → createUser Lambda
- `POST /transactions` → transactionService Lambda (if exists)

---

## RDS Setup (Manual - Not Scripted)

RDS requires manual setup due to VPC/security group complexity:

1. **Create RDS instance** (AWS Console):
   - Engine: MySQL
   - Template: Free tier
   - Instance: db.t3.micro
   - Note endpoint and credentials

2. **Run SQL schema**:
   ```bash
   mysql -h <endpoint> -u admin -p < database/mysql-transactions.sql
   ```

3. **Create Secrets Manager secret**:
   ```bash
   aws secretsmanager create-secret \
     --name capitalone/rds/mysql \
     --secret-string '{"username":"admin","password":"YOUR_PASSWORD","host":"YOUR_ENDPOINT","port":3306,"dbname":"capitalone_banking"}' \
     --region us-east-1
   ```

4. **Deploy transactionService**:
   ```bash
   # TODO: Create deploy-transactionService.sh script
   # Requires VPC configuration
   ```

---

## Verification

### Test createUser
```bash
API_ENDPOINT=$(aws apigatewayv2 get-apis --query "Items[?Name=='CapitalOne-Banking-API'].ApiEndpoint" --output text --region us-east-1)

curl -X POST "$API_ENDPOINT/users" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User","dob":"2000-01-01","email":"test@example.com","initialBalance":100}'
```

Expected: `{"userId":"...","balance":100}`

### Check DynamoDB
```bash
aws dynamodb scan --table-name CapitalOne-Users --region us-east-1
```

### Check Lambda logs
```bash
aws logs tail /aws/lambda/createUser --follow --region us-east-1
```

---

## Cleanup

Remove all resources:

```bash
# Delete Lambda
aws lambda delete-function --function-name createUser --region us-east-1
aws lambda delete-function --function-name transactionService --region us-east-1

# Delete API Gateway
API_ID=$(aws apigatewayv2 get-apis --query "Items[?Name=='CapitalOne-Banking-API'].ApiId" --output text --region us-east-1)
aws apigatewayv2 delete-api --api-id $API_ID --region us-east-1

# Delete DynamoDB table
aws dynamodb delete-table --table-name CapitalOne-Users --region us-east-1

# Delete IAM role
aws iam delete-role-policy --role-name CapitalOneLambdaRole --policy-name DynamoDBAccess
aws iam delete-role-policy --role-name CapitalOneLambdaRole --policy-name SecretsManagerAccess
aws iam detach-role-policy --role-name CapitalOneLambdaRole --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam detach-role-policy --role-name CapitalOneLambdaRole --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole
aws iam delete-role --role-name CapitalOneLambdaRole
```

---

## Troubleshooting

### "AccessDeniedException"
- Check AWS credentials: `aws sts get-caller-identity`
- Ensure your IAM user has admin permissions

### "Role not found"
- Wait 10 seconds after creating IAM role (propagation delay)
- Run `./scripts/setup-iam.sh` again

### "Table already exists"
- Scripts are idempotent (safe to re-run)
- Existing resources will be updated, not duplicated

### Lambda deployment fails
- Check that `lambdas/createUser/` exists
- Run `npm install` in Lambda directory first

---

## Advantages of CLI Scripts

✅ **Reproducible**: Same setup every time
✅ **Fast**: 2-3 minutes vs 30+ minutes manual
✅ **Documented**: Scripts serve as documentation
✅ **Version controlled**: Track infrastructure changes
✅ **Shareable**: Teammates can deploy identically

## Disadvantages

❌ **Learning curve**: Need to understand AWS CLI
❌ **Debugging**: Errors less visual than console
❌ **VPC complexity**: RDS/VPC still needs manual setup
