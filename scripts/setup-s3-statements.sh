#!/bin/bash
# Setup S3 Bucket for Capital One Account Statements
# Run this script after setting up your AWS CLI credentials

set -e

# Generate unique bucket name (S3 bucket names must be globally unique)
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET_NAME="capitalone-statements-${ACCOUNT_ID}"
REGION="us-east-1"

echo "Creating S3 Bucket: $BUCKET_NAME"

# Create S3 Bucket
aws s3api create-bucket \
    --bucket $BUCKET_NAME \
    --region $REGION

echo "✅ S3 Bucket created: $BUCKET_NAME"

# Block all public access (security best practice)
echo "Blocking public access..."
aws s3api put-public-access-block \
    --bucket $BUCKET_NAME \
    --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

echo "✅ Public access blocked"

# Enable versioning (optional, for audit trail)
echo "Enabling versioning..."
aws s3api put-bucket-versioning \
    --bucket $BUCKET_NAME \
    --versioning-configuration Status=Enabled

echo "✅ Versioning enabled"

# Set lifecycle rule to delete old statements after 365 days (cost optimization)
echo "Setting lifecycle policy..."
aws s3api put-bucket-lifecycle-configuration \
    --bucket $BUCKET_NAME \
    --lifecycle-configuration '{
        "Rules": [
            {
                "ID": "DeleteOldStatements",
                "Status": "Enabled",
                "Filter": {
                    "Prefix": "statements/"
                },
                "Expiration": {
                    "Days": 365
                }
            }
        ]
    }'

echo "✅ Lifecycle policy set (statements expire after 365 days)"

# Save bucket name for later use
mkdir -p ../config
echo "S3_BUCKET_NAME=$BUCKET_NAME" > ../config/s3-config.env
echo "Bucket name saved to config/s3-config.env"

echo ""
echo "=========================================="
echo "S3 Setup Complete!"
echo "=========================================="
echo "Bucket Name: $BUCKET_NAME"
echo ""
echo "Next steps:"
echo "1. Add S3_BUCKET_NAME environment variable to generateStatement Lambda"
echo "2. Add S3_BUCKET_NAME environment variable to getStatement Lambda"
echo ""
