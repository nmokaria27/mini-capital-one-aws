#!/bin/bash
# Deploy generateStatement Lambda function
# This Lambda is triggered by EventBridge and generates monthly statements

set -e

FUNCTION_NAME="generateStatement"
REGION="us-east-1"
RUNTIME="nodejs18.x"
HANDLER="index.handler"
TIMEOUT=60
MEMORY=256
DYNAMODB_TABLE="CapitalOne-Users"

echo "=========================================="
echo "Deploying $FUNCTION_NAME Lambda"
echo "=========================================="

# Check if S3_BUCKET_NAME is set
if [ -z "$S3_BUCKET_NAME" ]; then
    if [ -f "../config/s3-config.env" ]; then
        source ../config/s3-config.env
    else
        echo "Error: S3_BUCKET_NAME not set"
        echo "Run setup-s3-statements.sh first or: export S3_BUCKET_NAME=your-bucket-name"
        exit 1
    fi
fi

echo "Using S3 bucket: $S3_BUCKET_NAME"
echo "Using DynamoDB table: $DYNAMODB_TABLE"

# Navigate to Lambda directory
cd ../lambdas/generateStatement

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
    
    # Get the Lambda execution role ARN
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
        --environment "Variables={DYNAMODB_TABLE_NAME=$DYNAMODB_TABLE,S3_BUCKET_NAME=$S3_BUCKET_NAME}" \
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
        --environment "Variables={DYNAMODB_TABLE_NAME=$DYNAMODB_TABLE,S3_BUCKET_NAME=$S3_BUCKET_NAME}" \
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
echo "Next step: Setup EventBridge rule"
echo "Run: ./setup-eventbridge.sh $FUNCTION_ARN"
echo ""
echo "To test manually:"
echo "aws lambda invoke --function-name $FUNCTION_NAME --region $REGION /dev/stdout"
echo ""
