#!/bin/bash
set -e

# Deploy getBalance Lambda
# Usage: ./scripts/deploy-getBalance.sh

REGION="us-east-1"
FUNCTION_NAME="getBalance"
ROLE_NAME="CapitalOneLambdaRole"
TABLE_NAME="CapitalOne-Users"

echo "🚀 Deploying getBalance Lambda..."

# Get IAM role ARN
ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text --region $REGION)
echo "✅ Found IAM role: $ROLE_ARN"

# Package Lambda
echo "📦 Packaging Lambda..."
cd lambdas/getBalance
npm install --production
zip -r getBalance.zip . -x "*.git*" -x "node_modules/.cache/*"

# Check if Lambda exists
if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>/dev/null; then
  echo "🔄 Updating existing Lambda function..."
  aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://getBalance.zip \
    --region $REGION
  
  echo "⏳ Waiting for Lambda to be ready..."
  aws lambda wait function-updated --function-name $FUNCTION_NAME --region $REGION
  
  echo "⚙️  Updating configuration..."
  aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --runtime nodejs18.x \
    --handler index.handler \
    --environment "Variables={DYNAMODB_TABLE_NAME=$TABLE_NAME}" \
    --region $REGION
else
  echo "✨ Creating new Lambda function..."
  aws lambda create-function \
    --function-name $FUNCTION_NAME \
    --runtime nodejs18.x \
    --role $ROLE_ARN \
    --handler index.handler \
    --zip-file fileb://getBalance.zip \
    --environment "Variables={DYNAMODB_TABLE_NAME=$TABLE_NAME}" \
    --timeout 10 \
    --memory-size 256 \
    --region $REGION
fi

# Clean up
rm getBalance.zip
cd ../..

echo ""
echo "✅ getBalance Lambda deployed successfully!"
echo ""
echo "📝 Next step: Add API Gateway route GET /users/{userId}"
echo ""
echo "🧪 Test with:"
echo "aws lambda invoke --function-name $FUNCTION_NAME \\"
echo "  --payload '{\"pathParameters\":{\"userId\":\"test-uuid\"}}' \\"
echo "  response.json --region $REGION"
