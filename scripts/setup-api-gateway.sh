#!/bin/bash
set -e

# Setup API Gateway HTTP API via AWS CLI
# Usage: ./scripts/setup-api-gateway.sh

REGION="us-east-1"
API_NAME="CapitalOne-Banking-API"
FUNCTION_NAME_USER="createUser"
FUNCTION_NAME_TXN="transactionService"
AMPLIFY_URL="https://main.d39rly73pvywwe.amplifyapp.com"

echo "🌐 Setting up API Gateway..."

# Check if API exists
API_ID=$(aws apigatewayv2 get-apis --region $REGION --query "Items[?Name=='$API_NAME'].ApiId" --output text)

if [ -z "$API_ID" ]; then
  echo "✨ Creating new HTTP API..."
  API_ID=$(aws apigatewayv2 create-api \
    --name $API_NAME \
    --protocol-type HTTP \
    --cors-configuration "AllowOrigins=$AMPLIFY_URL,AllowMethods=GET,POST,OPTIONS,AllowHeaders=Content-Type,Accept" \
    --region $REGION \
    --query 'ApiId' \
    --output text)
  echo "✅ Created API: $API_ID"
else
  echo "✅ Found existing API: $API_ID"
fi

# Get Lambda ARNs
USER_LAMBDA_ARN=$(aws lambda get-function --function-name $FUNCTION_NAME_USER --region $REGION --query 'Configuration.FunctionArn' --output text)
echo "✅ Found createUser Lambda: $USER_LAMBDA_ARN"

# Create integration for createUser
echo "🔗 Creating integration for POST /users..."
USER_INTEGRATION_ID=$(aws apigatewayv2 create-integration \
  --api-id $API_ID \
  --integration-type AWS_PROXY \
  --integration-uri $USER_LAMBDA_ARN \
  --payload-format-version 2.0 \
  --region $REGION \
  --query 'IntegrationId' \
  --output text)

# Create route for POST /users
aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key "POST /users" \
  --target "integrations/$USER_INTEGRATION_ID" \
  --region $REGION 2>/dev/null || echo "Route already exists"

# Add Lambda permission for API Gateway
aws lambda add-permission \
  --function-name $FUNCTION_NAME_USER \
  --statement-id apigateway-invoke-users \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:$(aws sts get-caller-identity --query Account --output text):$API_ID/*/*/users" \
  --region $REGION 2>/dev/null || echo "Permission already exists"

# Check if transactionService exists
if aws lambda get-function --function-name $FUNCTION_NAME_TXN --region $REGION 2>/dev/null; then
  echo "🔗 Creating integration for POST /transactions..."
  TXN_LAMBDA_ARN=$(aws lambda get-function --function-name $FUNCTION_NAME_TXN --region $REGION --query 'Configuration.FunctionArn' --output text)
  
  TXN_INTEGRATION_ID=$(aws apigatewayv2 create-integration \
    --api-id $API_ID \
    --integration-type AWS_PROXY \
    --integration-uri $TXN_LAMBDA_ARN \
    --payload-format-version 2.0 \
    --region $REGION \
    --query 'IntegrationId' \
    --output text)
  
  aws apigatewayv2 create-route \
    --api-id $API_ID \
    --route-key "POST /transactions" \
    --target "integrations/$TXN_INTEGRATION_ID" \
    --region $REGION 2>/dev/null || echo "Route already exists"
  
  aws lambda add-permission \
    --function-name $FUNCTION_NAME_TXN \
    --statement-id apigateway-invoke-transactions \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$REGION:$(aws sts get-caller-identity --query Account --output text):$API_ID/*/*/transactions" \
    --region $REGION 2>/dev/null || echo "Permission already exists"
else
  echo "⚠️  transactionService Lambda not found, skipping /transactions route"
fi

# Get API endpoint
API_ENDPOINT=$(aws apigatewayv2 get-api --api-id $API_ID --region $REGION --query 'ApiEndpoint' --output text)

echo ""
echo "✅ API Gateway setup complete!"
echo "📝 API Endpoint: $API_ENDPOINT"
echo "📝 Update frontend/app.js with: const API_BASE = \"$API_ENDPOINT\";"
echo ""
echo "🧪 Test with:"
echo "curl -X POST \"$API_ENDPOINT/users\" -H \"Content-Type: application/json\" -d '{\"fullName\":\"Test\",\"dob\":\"2000-01-01\",\"email\":\"t@e.com\",\"initialBalance\":100}'"
