#!/bin/bash
# Setup EventBridge Rule for Monthly Statement Generation
# Run this script AFTER deploying the generateStatement Lambda

set -e

RULE_NAME="MonthlyStatementGenerator"
REGION="us-east-1"

echo "=========================================="
echo "EventBridge Setup for Monthly Statements"
echo "=========================================="
echo ""

# Check if Lambda function ARN is provided
if [ -z "$1" ]; then
    echo "Usage: ./setup-eventbridge.sh <generateStatement-lambda-arn>"
    echo ""
    echo "Example: ./setup-eventbridge.sh arn:aws:lambda:us-east-1:123456789:function:generateStatement"
    echo ""
    echo "First deploy the generateStatement Lambda, then run this script with its ARN."
    exit 1
fi

LAMBDA_ARN=$1

echo "Creating EventBridge rule: $RULE_NAME"

# Create the scheduled rule (runs at 8 AM UTC on the 1st of each month)
aws events put-rule \
    --name $RULE_NAME \
    --schedule-expression "cron(0 8 1 * ? *)" \
    --state ENABLED \
    --description "Triggers monthly statement generation on the 1st of each month at 8 AM UTC" \
    --region $REGION

echo "✅ EventBridge rule created"

# Get the rule ARN
RULE_ARN=$(aws events describe-rule \
    --name $RULE_NAME \
    --region $REGION \
    --query 'Arn' \
    --output text)

echo "Rule ARN: $RULE_ARN"

# Add permission for EventBridge to invoke Lambda
echo "Adding Lambda permission for EventBridge..."
aws lambda add-permission \
    --function-name generateStatement \
    --statement-id EventBridgeMonthlyStatement \
    --action lambda:InvokeFunction \
    --principal events.amazonaws.com \
    --source-arn $RULE_ARN \
    --region $REGION 2>/dev/null || echo "Permission may already exist, continuing..."

echo "✅ Lambda permission added"

# Add Lambda as target for the rule
echo "Setting Lambda as target..."
aws events put-targets \
    --rule $RULE_NAME \
    --targets "Id"="1","Arn"="$LAMBDA_ARN" \
    --region $REGION

echo "✅ Lambda target set"

# Save configuration
mkdir -p ../config
echo "EVENTBRIDGE_RULE_NAME=$RULE_NAME" > ../config/eventbridge-config.env
echo "EVENTBRIDGE_RULE_ARN=$RULE_ARN" >> ../config/eventbridge-config.env
echo "Configuration saved to config/eventbridge-config.env"

echo ""
echo "=========================================="
echo "EventBridge Setup Complete!"
echo "=========================================="
echo "Rule Name: $RULE_NAME"
echo "Schedule: 8 AM UTC on the 1st of each month"
echo "Target: $LAMBDA_ARN"
echo ""
echo "To test immediately (manual trigger):"
echo "aws lambda invoke --function-name generateStatement --region $REGION /dev/stdout"
echo ""
echo "To view upcoming invocations:"
echo "aws events list-rules --name-prefix $RULE_NAME --region $REGION"
echo ""
