# Terraform Infrastructure as Code

Deploy the entire AWS infrastructure with Terraform.

## Prerequisites

```bash
# Install Terraform
brew install terraform  # macOS
# or download from: https://www.terraform.io/downloads

# Configure AWS credentials
aws configure
```

## Quick Start

```bash
cd terraform

# Initialize Terraform
terraform init

# Preview changes
terraform plan

# Deploy infrastructure
terraform apply
# Type 'yes' when prompted

# Get outputs
terraform output
```

**Time**: ~2-3 minutes

## What Gets Created

- ✅ DynamoDB table: `CapitalOne-Users`
- ✅ IAM role: `CapitalOneLambdaRole` with all permissions
- ✅ Lambda function: `createUser`
- ✅ API Gateway HTTP API with CORS
- ✅ Route: `POST /users` → createUser Lambda
- ✅ Lambda permissions for API Gateway

## Before Running

**Package the Lambda function**:
```bash
cd ../lambdas/createUser
npm install --production
zip -r createUser.zip .
cd ../../terraform
```

## Outputs

After `terraform apply`, you'll see:

```
Outputs:

api_endpoint = "https://abc123.execute-api.us-east-1.amazonaws.com"
dynamodb_table = "CapitalOne-Users"
lambda_role_arn = "arn:aws:iam::123456789012:role/CapitalOneLambdaRole"
```

**Update your frontend**:
```javascript
// frontend/app.js
const API_BASE = "https://abc123.execute-api.us-east-1.amazonaws.com";
```

## Verify Deployment

```bash
# Test the API
API_ENDPOINT=$(terraform output -raw api_endpoint)
curl -X POST "$API_ENDPOINT/users" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test","dob":"2000-01-01","email":"t@e.com","initialBalance":100}'
```

Expected: `{"userId":"...","balance":100}`

## Modify Infrastructure

Edit `main.tf` and run:
```bash
terraform plan   # Preview changes
terraform apply  # Apply changes
```

## Destroy Infrastructure

**⚠️ Warning: This deletes everything!**

```bash
terraform destroy
# Type 'yes' when prompted
```

## Advantages of Terraform

✅ **Declarative**: Describe what you want, not how to create it
✅ **State management**: Tracks what's deployed
✅ **Idempotent**: Safe to run multiple times
✅ **Version controlled**: Infrastructure as code
✅ **Preview changes**: `terraform plan` shows what will change
✅ **Rollback**: Easy to revert changes
✅ **Multi-cloud**: Works with AWS, Azure, GCP, etc.

## Disadvantages

❌ **Learning curve**: Need to learn HCL syntax
❌ **State file**: Need to manage `terraform.tfstate`
❌ **Not included**: RDS (too complex for this example)

## Adding transactionService

After setting up RDS manually, add to `main.tf`:

```hcl
resource "aws_lambda_function" "transaction_service" {
  filename      = "../lambdas/transactionService/transactionService.zip"
  function_name = "transactionService"
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  timeout       = 30
  memory_size   = 512

  environment {
    variables = {
      DYNAMODB_TABLE_NAME = aws_dynamodb_table.users.name
      DB_SECRET_ARN       = "arn:aws:secretsmanager:us-east-1:...:secret:capitalone/rds/mysql-..."
      DB_HOST             = "your-rds-endpoint.rds.amazonaws.com"
      DB_NAME             = "capitalone_banking"
    }
  }

  vpc_config {
    subnet_ids         = ["subnet-xxx", "subnet-yyy"]
    security_group_ids = ["sg-xxx"]
  }
}

resource "aws_apigatewayv2_integration" "transaction_service" {
  api_id           = aws_apigatewayv2_api.main.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.transaction_service.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "transaction_service" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /transactions"
  target    = "integrations/${aws_apigatewayv2_integration.transaction_service.id}"
}

resource "aws_lambda_permission" "api_gateway_transaction" {
  statement_id  = "AllowAPIGatewayInvokeTransactions"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.transaction_service.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*/transactions"
}
```

## Best Practices

1. **Use variables**: Define reusable values in `variables.tf`
2. **Remote state**: Store state in S3 for team collaboration
3. **Modules**: Break complex infrastructure into modules
4. **Workspaces**: Separate dev/staging/prod environments
5. **Version control**: Commit `main.tf`, ignore `terraform.tfstate`

## Troubleshooting

### "Error creating Lambda function"
- Ensure zip file exists: `ls -lh ../lambdas/createUser/createUser.zip`
- Package Lambda first: `cd ../lambdas/createUser && npm install && zip -r createUser.zip .`

### "Error assuming role"
- Wait 10 seconds after IAM role creation
- Run `terraform apply` again

### "State lock error"
- Another terraform process is running
- Or previous run was interrupted
- Force unlock: `terraform force-unlock <LOCK_ID>`

## Learn More

- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Terraform Language](https://www.terraform.io/language)
- [Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/index.html)
