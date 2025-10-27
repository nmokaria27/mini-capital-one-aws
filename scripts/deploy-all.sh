#!/bin/bash
set -e

# Master deployment script - runs all setup scripts in order
# Usage: ./scripts/deploy-all.sh

echo "🚀 Starting full deployment..."
echo ""

# Make scripts executable
chmod +x scripts/*.sh

# Step 1: IAM
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Setting up IAM role"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./scripts/setup-iam.sh
echo ""

# Wait for IAM propagation
echo "⏳ Waiting 10 seconds for IAM propagation..."
sleep 10

# Step 2: DynamoDB
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Setting up DynamoDB"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./scripts/setup-dynamodb.sh
echo ""

# Step 3: Deploy createUser Lambda
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Deploying createUser Lambda"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./scripts/deploy-createUser.sh
echo ""

# Step 4: API Gateway
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Setting up API Gateway"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./scripts/setup-api-gateway.sh
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deployment complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Next steps:"
echo "1. Update frontend/app.js with the API endpoint shown above"
echo "2. Push to GitHub (Amplify will auto-deploy)"
echo "3. Test user creation from Amplify frontend"
echo ""
echo "⚠️  Note: transactionService requires RDS setup first"
echo "   Follow DEPLOYMENT-CHECKLIST.md sections B1-B3"
echo "   Then run: ./scripts/deploy-transactionService.sh"
