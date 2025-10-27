#!/bin/bash
set -e

# Deploy createUser Lambda via AWS CLI
# Usage: ./scripts/deploy-createUser.sh

REGION="us-east-1"
FUNCTION_NAME="createUser"
ROLE_NAME="CapitalOneLambdaRole"
TABLE_NAME="CapitalOne-Users"

echo "🚀 Deploying createUser Lambda..."

# Get IAM role ARN
ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text)
echo "✅ Found IAM role: $ROLE_ARN"

# Package Lambda
echo "📦 Packaging Lambda..."
cd lambdas/createUser
npm install --production
zip -r createUser.zip . -x "*.git*" -x "node_modules/.cache/*"

# Check if Lambda exists
if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>/dev/null; then
  echo "🔄 Updating existing Lambda function..."
  aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://createUser.zip \
    --region $REGION
  
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
    --zip-file fileb://createUser.zip \
    --environment "Variables={DYNAMODB_TABLE_NAME=$TABLE_NAME}" \
    --timeout 10 \
    --memory-size 256 \
    --region $REGION
fi

# Clean up
rm createUser.zip
cd ../..

echo "✅ createUser Lambda deployed successfully!"
echo "📝 Test with:"
echo "aws lambda invoke --function-name $FUNCTION_NAME --payload '{\"body\":\"{\\\"fullName\\\":\\\"Test\\\",\\\"dob\\\":\\\"2000-01-01\\\",\\\"email\\\":\\\"t@e.com\\\",\\\"initialBalance\\\":100}\"}' response.json --region $REGION"
