#!/bin/bash
# Update transactionService Lambda with SNS integration
# Run this after setting up SNS topic

set -e

FUNCTION_NAME="transactionService"
REGION="us-east-1"
DYNAMODB_TABLE="CapitalOne-Users"

echo "=========================================="
echo "Updating $FUNCTION_NAME Lambda with SNS"
echo "=========================================="

# Check if SNS_TOPIC_ARN is set
if [ -z "$SNS_TOPIC_ARN" ]; then
    if [ -f "../config/sns-config.env" ]; then
        source ../config/sns-config.env
        SNS_TOPIC_ARN=$TOPIC_ARN
    else
        echo "Error: SNS_TOPIC_ARN not set"
        echo "Run setup-sns.sh first or: export SNS_TOPIC_ARN=arn:aws:sns:..."
        exit 1
    fi
fi

echo "Using SNS Topic: $SNS_TOPIC_ARN"
echo "Using DynamoDB table: $DYNAMODB_TABLE"

# Navigate to Lambda directory
cd ../lambdas/transactionService

# Install dependencies (including SNS client)
echo "Installing dependencies..."
npm install --production

# Create deployment package
echo "Creating deployment package..."
zip -r function.zip . -x "*.git*" -x "index-*.mjs"

# Update Lambda code
echo "Updating Lambda code..."
aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://function.zip \
    --region $REGION

# Wait for update to complete
echo "Waiting for code update..."
aws lambda wait function-updated --function-name $FUNCTION_NAME --region $REGION

# Update environment variables to include SNS_TOPIC_ARN
echo "Updating environment variables..."
aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --environment "Variables={DYNAMODB_TABLE_NAME=$DYNAMODB_TABLE,SNS_TOPIC_ARN=$SNS_TOPIC_ARN}" \
    --region $REGION

echo "✅ Lambda function updated"

# Clean up
rm function.zip

echo ""
echo "=========================================="
echo "Update Complete!"
echo "=========================================="
echo "Function: $FUNCTION_NAME"
echo "SNS Topic: $SNS_TOPIC_ARN"
echo ""
echo "Transactions will now publish to SNS for email notifications."
echo ""
