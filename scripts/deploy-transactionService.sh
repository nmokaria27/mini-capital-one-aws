#!/bin/bash
set -e

# Deploy transactionService Lambda with VPC configuration
# Prerequisites: RDS instance created, Secrets Manager configured
# Usage: ./scripts/deploy-transactionService.sh

REGION="us-east-1"
FUNCTION_NAME="transactionService"
ROLE_NAME="CapitalOneLambdaRole"
TABLE_NAME="CapitalOne-Users"

echo "🚀 Deploying transactionService Lambda..."

# Check if required environment variables are set
if [ -z "$DB_SECRET_ARN" ]; then
  echo "⚠️  Warning: DB_SECRET_ARN not set. You'll need to configure this manually."
  echo "   Example: export DB_SECRET_ARN='arn:aws:secretsmanager:us-east-1:123456789012:secret:capitalone/rds/mysql-xxxxx'"
fi

if [ -z "$DB_HOST" ]; then
  echo "⚠️  Warning: DB_HOST not set. You'll need to configure this manually."
  echo "   Example: export DB_HOST='your-rds-endpoint.rds.amazonaws.com'"
fi

# Get IAM role ARN
ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text --region $REGION)
echo "✅ Found IAM role: $ROLE_ARN"

# Package Lambda
echo "📦 Packaging Lambda..."
cd lambdas/transactionService
npm install --production
zip -r transactionService.zip . -x "*.git*" -x "node_modules/.cache/*"

# Check if Lambda exists
if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>/dev/null; then
  echo "🔄 Updating existing Lambda function..."
  aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://transactionService.zip \
    --region $REGION
  
  echo "⏳ Waiting for Lambda to be ready..."
  aws lambda wait function-updated --function-name $FUNCTION_NAME --region $REGION
  
  echo "⚙️  Updating configuration..."
  aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --runtime nodejs18.x \
    --handler index.handler \
    --timeout 30 \
    --memory-size 512 \
    --environment "Variables={DYNAMODB_TABLE_NAME=$TABLE_NAME,DB_SECRET_ARN=${DB_SECRET_ARN:-REPLACE_ME},DB_HOST=${DB_HOST:-REPLACE_ME},DB_NAME=capitalone_banking}" \
    --region $REGION
else
  echo "✨ Creating new Lambda function..."
  
  # Create without VPC first (you'll need to add VPC manually)
  aws lambda create-function \
    --function-name $FUNCTION_NAME \
    --runtime nodejs18.x \
    --role $ROLE_ARN \
    --handler index.handler \
    --zip-file fileb://transactionService.zip \
    --timeout 30 \
    --memory-size 512 \
    --environment "Variables={DYNAMODB_TABLE_NAME=$TABLE_NAME,DB_SECRET_ARN=${DB_SECRET_ARN:-REPLACE_ME},DB_HOST=${DB_HOST:-REPLACE_ME},DB_NAME=capitalone_banking}" \
    --region $REGION
  
  echo ""
  echo "⚠️  IMPORTANT: You need to configure VPC settings manually:"
  echo "   1. Go to Lambda Console → $FUNCTION_NAME → Configuration → VPC"
  echo "   2. Select the same VPC as your RDS instance"
  echo "   3. Select at least 2 subnets (preferably private)"
  echo "   4. Select a security group that can reach RDS on port 3306"
fi

# Clean up
rm transactionService.zip
cd ../..

echo ""
echo "✅ transactionService Lambda deployed!"
echo ""
echo "📝 Next steps:"
echo "   1. Configure VPC settings (if new Lambda)"
echo "   2. Update environment variables with actual DB_SECRET_ARN and DB_HOST"
echo "   3. Ensure security groups allow Lambda → RDS:3306"
echo "   4. Add API Gateway route: POST /transactions"
echo ""
echo "🧪 Test with:"
echo "aws lambda invoke --function-name $FUNCTION_NAME \\"
echo "  --payload '{\"body\":\"{\\\"userId\\\":\\\"test-uuid\\\",\\\"type\\\":\\\"DEPOSIT\\\",\\\"amount\\\":50}\"}' \\"
echo "  response.json --region $REGION"
