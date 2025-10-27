#!/bin/bash
set -e

# Add missing API Gateway routes for transactions and balance check
# Prerequisites: transactionService and getBalance Lambdas must be deployed
# Usage: ./scripts/setup-missing-routes.sh

REGION="us-east-1"
API_NAME="CapitalOne-Banking-API"
AMPLIFY_URL="https://main.d39rly73pvywwe.amplifyapp.com"

echo "🌐 Setting up missing API Gateway routes..."

# Get API ID
API_ID=$(aws apigatewayv2 get-apis --region $REGION --query "Items[?Name=='$API_NAME'].ApiId" --output text)

if [ -z "$API_ID" ]; then
  echo "❌ Error: API Gateway '$API_NAME' not found!"
  exit 1
fi

echo "✅ Found API: $API_ID"

# Get account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# ========== POST /transactions ==========
echo ""
echo "📝 Setting up POST /transactions route..."

if aws lambda get-function --function-name transactionService --region $REGION 2>/dev/null; then
  TXN_LAMBDA_ARN=$(aws lambda get-function --function-name transactionService --region $REGION --query 'Configuration.FunctionArn' --output text)
  echo "✅ Found transactionService Lambda: $TXN_LAMBDA_ARN"
  
  # Create integration
  TXN_INTEGRATION_ID=$(aws apigatewayv2 create-integration \
    --api-id $API_ID \
    --integration-type AWS_PROXY \
    --integration-uri $TXN_LAMBDA_ARN \
    --payload-format-version 2.0 \
    --region $REGION \
    --query 'IntegrationId' \
    --output text 2>/dev/null || \
    aws apigatewayv2 get-integrations --api-id $API_ID --region $REGION --query "Items[?IntegrationUri=='$TXN_LAMBDA_ARN'].IntegrationId" --output text)
  
  echo "✅ Integration created: $TXN_INTEGRATION_ID"
  
  # Create route
  aws apigatewayv2 create-route \
    --api-id $API_ID \
    --route-key "POST /transactions" \
    --target "integrations/$TXN_INTEGRATION_ID" \
    --region $REGION 2>/dev/null && echo "✅ Route created: POST /transactions" || echo "⚠️  Route already exists"
  
  # Add Lambda permission
  aws lambda add-permission \
    --function-name transactionService \
    --statement-id apigateway-invoke-transactions \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/*/transactions" \
    --region $REGION 2>/dev/null && echo "✅ Lambda permission added" || echo "⚠️  Permission already exists"
else
  echo "⚠️  transactionService Lambda not found. Skipping POST /transactions route."
  echo "   Deploy it first with: ./scripts/deploy-transactionService.sh"
fi

# ========== GET /users/{userId} ==========
echo ""
echo "📝 Setting up GET /users/{userId} route..."

if aws lambda get-function --function-name getBalance --region $REGION 2>/dev/null; then
  BALANCE_LAMBDA_ARN=$(aws lambda get-function --function-name getBalance --region $REGION --query 'Configuration.FunctionArn' --output text)
  echo "✅ Found getBalance Lambda: $BALANCE_LAMBDA_ARN"
  
  # Create integration
  BALANCE_INTEGRATION_ID=$(aws apigatewayv2 create-integration \
    --api-id $API_ID \
    --integration-type AWS_PROXY \
    --integration-uri $BALANCE_LAMBDA_ARN \
    --payload-format-version 2.0 \
    --region $REGION \
    --query 'IntegrationId' \
    --output text 2>/dev/null || \
    aws apigatewayv2 get-integrations --api-id $API_ID --region $REGION --query "Items[?IntegrationUri=='$BALANCE_LAMBDA_ARN'].IntegrationId" --output text)
  
  echo "✅ Integration created: $BALANCE_INTEGRATION_ID"
  
  # Create route
  aws apigatewayv2 create-route \
    --api-id $API_ID \
    --route-key "GET /users/{userId}" \
    --target "integrations/$BALANCE_INTEGRATION_ID" \
    --region $REGION 2>/dev/null && echo "✅ Route created: GET /users/{userId}" || echo "⚠️  Route already exists"
  
  # Add Lambda permission
  aws lambda add-permission \
    --function-name getBalance \
    --statement-id apigateway-invoke-balance \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/*/users/*" \
    --region $REGION 2>/dev/null && echo "✅ Lambda permission added" || echo "⚠️  Permission already exists"
else
  echo "⚠️  getBalance Lambda not found. Skipping GET /users/{userId} route."
  echo "   Deploy it first with: ./scripts/deploy-getBalance.sh"
fi

# Get API endpoint
API_ENDPOINT=$(aws apigatewayv2 get-api --api-id $API_ID --region $REGION --query 'ApiEndpoint' --output text)

echo ""
echo "✅ API Gateway routes setup complete!"
echo ""
echo "📝 API Endpoint: $API_ENDPOINT"
echo ""
echo "🧪 Test routes:"
echo ""
echo "# Test balance check:"
echo "curl -X GET \"$API_ENDPOINT/users/<userId>\""
echo ""
echo "# Test transaction:"
echo "curl -X POST \"$API_ENDPOINT/transactions\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"userId\":\"<userId>\",\"type\":\"DEPOSIT\",\"amount\":100}'"
