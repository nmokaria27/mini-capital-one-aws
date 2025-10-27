#!/bin/bash
set -e

# Setup IAM role for Lambda functions
# Usage: ./scripts/setup-iam.sh

REGION="us-east-1"
ROLE_NAME="CapitalOneLambdaRole"
TABLE_NAME="CapitalOne-Users"

echo "🔐 Setting up IAM role..."

# Check if role exists
if aws iam get-role --role-name $ROLE_NAME 2>/dev/null; then
  echo "✅ Role $ROLE_NAME already exists"
else
  echo "✨ Creating IAM role..."
  
  # Create trust policy
  cat > /tmp/trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

  aws iam create-role \
    --role-name $ROLE_NAME \
    --assume-role-policy-document file:///tmp/trust-policy.json
  
  echo "✅ Role created"
fi

# Attach AWS managed policies
echo "📎 Attaching managed policies..."
aws iam attach-role-policy \
  --role-name $ROLE_NAME \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole 2>/dev/null || echo "Already attached"

aws iam attach-role-policy \
  --role-name $ROLE_NAME \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole 2>/dev/null || echo "Already attached"

# Create custom policy for DynamoDB
echo "📝 Creating DynamoDB policy..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

cat > /tmp/dynamodb-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:$REGION:$ACCOUNT_ID:table/$TABLE_NAME"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name $ROLE_NAME \
  --policy-name DynamoDBAccess \
  --policy-document file:///tmp/dynamodb-policy.json

# Create policy for Secrets Manager (for transactionService)
echo "📝 Creating Secrets Manager policy..."
cat > /tmp/secrets-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "arn:aws:secretsmanager:$REGION:$ACCOUNT_ID:secret:capitalone/rds/mysql-*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name $ROLE_NAME \
  --policy-name SecretsManagerAccess \
  --policy-document file:///tmp/secrets-policy.json

# Clean up temp files
rm /tmp/trust-policy.json /tmp/dynamodb-policy.json /tmp/secrets-policy.json

echo "✅ IAM role setup complete!"
echo "📝 Role ARN: arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME"
