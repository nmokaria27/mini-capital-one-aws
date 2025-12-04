#!/bin/bash
# Setup SNS Topic for Capital One Transaction Notifications
# Run this script after setting up your AWS CLI credentials

set -e

TOPIC_NAME="CapitalOne-Transactions"
REGION="us-east-1"

echo "Creating SNS Topic: $TOPIC_NAME"

# Create SNS Topic
TOPIC_ARN=$(aws sns create-topic \
    --name $TOPIC_NAME \
    --region $REGION \
    --query 'TopicArn' \
    --output text)

echo "✅ SNS Topic created: $TOPIC_ARN"

# Save the ARN for later use
echo "TOPIC_ARN=$TOPIC_ARN" > ../config/sns-config.env
echo "Topic ARN saved to config/sns-config.env"

# Set topic policy to allow Lambda to publish
echo "Setting topic policy..."
aws sns set-topic-attributes \
    --topic-arn $TOPIC_ARN \
    --attribute-name Policy \
    --attribute-value '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": "lambda.amazonaws.com"
                },
                "Action": "sns:Publish",
                "Resource": "'$TOPIC_ARN'"
            }
        ]
    }' \
    --region $REGION

echo "✅ Topic policy set"

echo ""
echo "=========================================="
echo "SNS Setup Complete!"
echo "=========================================="
echo "Topic ARN: $TOPIC_ARN"
echo ""
echo "Next steps:"
echo "1. Add SNS_TOPIC_ARN environment variable to transactionService Lambda"
echo "2. Create sendNotification Lambda and subscribe it to this topic"
echo ""
