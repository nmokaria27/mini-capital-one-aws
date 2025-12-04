#!/bin/bash
# Deploy sendNotification Lambda function
# This Lambda is triggered by SNS and sends emails via SES

set -e

FUNCTION_NAME="sendNotification"
REGION="us-east-1"
RUNTIME="nodejs18.x"
HANDLER="index.handler"
TIMEOUT=30
MEMORY=128

echo "=========================================="
echo "Deploying $FUNCTION_NAME Lambda"
echo "=========================================="

# Check if SENDER_EMAIL is set
if [ -z "$SENDER_EMAIL" ]; then
    if [ -f "../config/ses-config.env" ]; then
        source ../config/ses-config.env
    else
        echo "Error: SENDER_EMAIL not set"
        echo "Run: export SENDER_EMAIL=your-verified-email@example.com"
        exit 1
    fi
fi

echo "Using sender email: $SENDER_EMAIL"

# Navigate to Lambda directory
cd ../lambdas/sendNotification

# Install dependencies
echo "Installing dependencies..."
npm install --production

# Create deployment package
echo "Creating deployment package..."
zip -r function.zip . -x "*.git*"

# Check if function exists
FUNCTION_EXISTS=$(aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>&1 || true)

if echo "$FUNCTION_EXISTS" | grep -q "ResourceNotFoundException"; then
    echo "Creating new Lambda function..."
    
    # Get the Lambda execution role ARN (assumes it exists from midterm)
    ROLE_ARN=$(aws iam get-role --role-name CapitalOne-Lambda-Role --query 'Role.Arn' --output text 2>/dev/null || echo "")
    
    if [ -z "$ROLE_ARN" ]; then
        echo "Error: CapitalOne-Lambda-Role not found. Please create it first."
        exit 1
    fi
    
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime $RUNTIME \
        --handler $HANDLER \
        --role $ROLE_ARN \
        --zip-file fileb://function.zip \
        --timeout $TIMEOUT \
        --memory-size $MEMORY \
        --environment "Variables={SENDER_EMAIL=$SENDER_EMAIL}" \
        --region $REGION
    
    echo "✅ Lambda function created"
else
    echo "Updating existing Lambda function..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://function.zip \
        --region $REGION
    
    # Update environment variables
    aws lambda update-function-configuration \
        --function-name $FUNCTION_NAME \
        --environment "Variables={SENDER_EMAIL=$SENDER_EMAIL}" \
        --region $REGION
    
    echo "✅ Lambda function updated"
fi

# Clean up
rm function.zip

# Get function ARN
FUNCTION_ARN=$(aws lambda get-function --function-name $FUNCTION_NAME --region $REGION --query 'Configuration.FunctionArn' --output text)

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo "Function: $FUNCTION_NAME"
echo "ARN: $FUNCTION_ARN"
echo ""
echo "Next step: Subscribe this Lambda to SNS topic"
echo "Run: aws sns subscribe --topic-arn <SNS_TOPIC_ARN> --protocol lambda --notification-endpoint $FUNCTION_ARN --region $REGION"
echo ""
