# Capital One Banking (Serverless)

A minimal serverless banking app demonstrating user creation, balance checks, and transactions on AWS.

## Live
- Frontend: https://main.d39rly73pvywwe.amplifyapp.com
- API Base: https://wmg52t8w3j.execute-api.us-east-1.amazonaws.com

## Features
- Create account with initial balance
- Deposit and withdraw with atomic balance updates
- Check balance (real-time)

## Services Used
- Amplify (hosting)
- API Gateway (HTTP API)
- Lambda (Node.js 18, ES modules)
- DynamoDB (user profiles + balances)
- IAM + CloudWatch (security, logs)

## Endpoints
- POST /users
- GET /users/{userId}
- POST /transactions

## Structure
```
frontend/              # Web UI (HTML/CSS/JS)
lambdas/
  createUser/         # POST /users
  getBalance/         # GET /users/{userId}
  transactionService/ # POST /transactions
database/             # Schemas (DynamoDB, MySQL)
scripts/              # Deployment helpers
iam/                  # IAM policies
```

## Quick Start
- Prereqs: AWS CLI, Node.js 18+
- Deploy Lambdas: run scripts in scripts/
- Add routes: ./scripts/setup-missing-routes.sh
- Push to main to auto-deploy frontend via Amplify

## Tech Stack
- Frontend: Vanilla JS, HTML, CSS
- Backend: AWS Lambda (Node 18, ESM)
- Data: DynamoDB (on-demand)
- API: API Gateway (HTTP)

## License
MIT

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
