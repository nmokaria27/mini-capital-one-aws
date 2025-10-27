#!/bin/bash
set -e

# Create DynamoDB table via AWS CLI
# Usage: ./scripts/setup-dynamodb.sh

REGION="us-east-1"
TABLE_NAME="CapitalOne-Users"

echo "🗄️  Setting up DynamoDB table..."

# Check if table exists
if aws dynamodb describe-table --table-name $TABLE_NAME --region $REGION 2>/dev/null; then
  echo "✅ Table $TABLE_NAME already exists"
else
  echo "✨ Creating table $TABLE_NAME..."
  aws dynamodb create-table \
    --table-name $TABLE_NAME \
    --attribute-definitions AttributeName=userId,AttributeType=S \
    --key-schema AttributeName=userId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION \
    --tags Key=Project,Value=CapitalOne-Banking
  
  echo "⏳ Waiting for table to be active..."
  aws dynamodb wait table-exists --table-name $TABLE_NAME --region $REGION
  
  echo "✅ Table created successfully!"
fi

echo "📊 Table details:"
aws dynamodb describe-table --table-name $TABLE_NAME --region $REGION --query 'Table.[TableName,TableStatus,ItemCount]' --output table
