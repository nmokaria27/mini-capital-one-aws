#!/bin/bash
# Setup SES (Simple Email Service) for Capital One Notifications
# Run this script after setting up your AWS CLI credentials

set -e

REGION="us-east-1"

echo "=========================================="
echo "SES Setup for Capital One Banking"
echo "=========================================="
echo ""

# Check if email is provided as argument
if [ -z "$1" ]; then
    echo "Usage: ./setup-ses.sh <your-email-address>"
    echo ""
    echo "Example: ./setup-ses.sh john@example.com"
    echo ""
    echo "This email will be used as the sender address for notifications."
    echo "You will receive a verification email - click the link to verify."
    exit 1
fi

SENDER_EMAIL=$1

echo "Verifying email address: $SENDER_EMAIL"

# Verify email identity
aws ses verify-email-identity \
    --email-address $SENDER_EMAIL \
    --region $REGION

echo "✅ Verification email sent to $SENDER_EMAIL"
echo ""
echo "⚠️  IMPORTANT: Check your inbox and click the verification link!"
echo ""

# Save sender email for later use
mkdir -p ../config
echo "SENDER_EMAIL=$SENDER_EMAIL" > ../config/ses-config.env
echo "Sender email saved to config/ses-config.env"

# Check verification status
echo "Checking verification status..."
sleep 3

VERIFICATION_STATUS=$(aws ses get-identity-verification-attributes \
    --identities $SENDER_EMAIL \
    --region $REGION \
    --query "VerificationAttributes.\"$SENDER_EMAIL\".VerificationStatus" \
    --output text)

echo "Current status: $VERIFICATION_STATUS"

echo ""
echo "=========================================="
echo "SES Setup Instructions"
echo "=========================================="
echo ""
echo "1. Check your email ($SENDER_EMAIL) for verification link"
echo "2. Click the link to verify your email"
echo "3. Run this command to check status:"
echo "   aws ses get-identity-verification-attributes --identities $SENDER_EMAIL --region $REGION"
echo ""
echo "⚠️  SES SANDBOX MODE:"
echo "   By default, SES is in sandbox mode. You can only send emails to verified addresses."
echo "   For testing, verify any recipient emails using:"
echo "   aws ses verify-email-identity --email-address <recipient-email> --region $REGION"
echo ""
echo "   To move out of sandbox (production), request production access in AWS Console:"
echo "   SES → Account dashboard → Request production access"
echo ""
echo "Next steps:"
echo "1. Verify your email by clicking the link"
echo "2. Add SENDER_EMAIL environment variable to sendNotification Lambda"
echo ""
