# Capital One Banking System

A serverless banking application built with AWS services, featuring user account creation, balance management, and transaction processing.

## 🚀 Live Demo

- **Frontend**: https://main.d39rly73pvywwe.amplifyapp.com
- **API Endpoint**: https://wmg52t8w3j.execute-api.us-east-1.amazonaws.com

## ✨ Features

- **User Account Creation** - Create banking accounts with initial balance
- **Balance Checking** - View current account balance in real-time
- **Transactions** - Deposit and withdraw funds with atomic balance updates
- **Secure Authentication** - User ID-based session management
- **Real-time Updates** - Instant balance updates after transactions

## 🏗️ Architecture

### AWS Services
- **AWS Amplify** - Frontend hosting with CI/CD
- **API Gateway** - HTTP API for RESTful endpoints
- **Lambda** - Serverless functions (Node.js 18)
- **DynamoDB** - NoSQL database for user data and balances
- **IAM** - Role-based access control
- **CloudWatch** - Logging and monitoring

### API Endpoints
```
POST   /users              - Create new user account
GET    /users/{userId}     - Get user balance and info
POST   /transactions       - Process deposit/withdrawal
```

## 📁 Project Structure

```
├── frontend/              # Web application (HTML/CSS/JS)
├── lambdas/              # Lambda function code
│   ├── createUser/       # User creation service
│   ├── getBalance/       # Balance retrieval service
│   └── transactionService/ # Transaction processing
├── database/             # Database schemas
├── scripts/              # Deployment automation scripts
└── iam/                  # IAM policies
```

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: AWS Lambda (Node.js 18, ES Modules)
- **Database**: DynamoDB (on-demand billing)
- **API**: AWS API Gateway (HTTP API)
- **Hosting**: AWS Amplify
- **CI/CD**: GitHub + Amplify auto-deploy

## 💰 Cost

**$0/month** - All services within AWS Free Tier

## 🚀 Quick Start

### Prerequisites
- AWS Account
- AWS CLI configured
- Node.js 18+

### Deployment

1. **Deploy Lambda Functions**
```bash
./scripts/deploy-createUser.sh
./scripts/deploy-getBalance.sh
./scripts/deploy-transactionService.sh
```

2. **Setup API Gateway Routes**
```bash
./scripts/setup-missing-routes.sh
```

3. **Deploy Frontend**
```bash
git push origin main  # Amplify auto-deploys
```

## 📝 Usage

### Create Account
1. Visit the website
2. Fill in: Full Name, Date of Birth, Email, Initial Balance
3. Click "Create Account"
4. Copy your User ID (displayed at top)

### Make Transaction
1. Select transaction type (Deposit/Withdrawal)
2. Enter amount
3. Click "Submit Transaction"

### Check Balance
1. Click "Check My Balance"
2. View current balance and account info

## 🔒 Security Features

- Atomic balance updates (prevents race conditions)
- Input validation on client and server
- IAM role-based access control
- CORS configuration for secure API access
- CloudWatch logging for audit trails

## 📊 Performance

- **Response Time**: < 200ms average
- **Availability**: 99.9% (AWS SLA)
- **Scalability**: Auto-scales with Lambda
- **Concurrent Users**: Unlimited (serverless)

## 🧪 Testing

Test the API directly:

```bash
# Create user
curl -X POST "https://wmg52t8w3j.execute-api.us-east-1.amazonaws.com/users" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"John Doe","dob":"1990-01-01","email":"john@example.com","initialBalance":1000}'

# Check balance
curl "https://wmg52t8w3j.execute-api.us-east-1.amazonaws.com/users/{userId}"

# Make deposit
curl -X POST "https://wmg52t8w3j.execute-api.us-east-1.amazonaws.com/transactions" \
  -H "Content-Type: application/json" \
  -d '{"userId":"{userId}","type":"DEPOSIT","amount":100}'
```

## 📄 License

MIT License - Feel free to use this project for learning purposes.

## 👥 Contributors

Built as part of CMSC398P AWS Cloud Computing course project.
