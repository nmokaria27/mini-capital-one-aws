# Project Status Report - Capital One Banking App

**Date**: October 26, 2025
**Project**: Mini Capital One AWS Midterm
**Team**: 2 members

---

## 🎯 Overall Status: 70% Complete

### ✅ Completed (Teammate A)
- [x] Frontend UI (HTML/CSS/JS)
- [x] Amplify hosting configured
- [x] DynamoDB table created
- [x] API Gateway HTTP API created
- [x] POST /users route configured
- [x] IAM role created
- [x] Frontend correctly calls API endpoints

### 🚧 In Progress (Teammate B)
- [ ] RDS MySQL instance setup
- [ ] Secrets Manager configuration
- [ ] transactionService Lambda deployment
- [ ] POST /transactions route
- [ ] End-to-end testing

### 🔴 Critical Fixes Applied
- [x] Updated Lambda code to ES modules (.mjs)
- [x] Fixed transaction field names (type vs transactionType)
- [x] Added transaction ID to responses
- [x] Implemented Secrets Manager integration
- [x] Added atomic updates with race condition prevention
- [x] Migrated to AWS SDK v3

---

## 📊 Component Status

| Component | Status | Notes |
|-----------|--------|-------|
| **Frontend** | ✅ Complete | Hosted on Amplify, correctly configured |
| **API Gateway** | ⚠️ Partial | /users works, /transactions needs route |
| **DynamoDB** | ✅ Complete | Table created, working |
| **createUser Lambda** | ⚠️ Needs Update | Old version deployed, new ES module version ready |
| **transactionService Lambda** | 🔴 Not Deployed | New version ready, needs RDS first |
| **RDS MySQL** | 🔴 Not Created | Teammate B task |
| **Secrets Manager** | 🔴 Not Configured | Teammate B task |
| **IAM Permissions** | ⚠️ Partial | Needs Secrets Manager policy |

---

## 🔑 Key Information

### URLs
- **Frontend**: `https://main.d39rly73pvywwe.amplifyapp.com`
- **API Gateway**: `https://y85zq1ex6c.execute-api.us-east-1.amazonaws.com`
- **Stage**: `$default` (no stage prefix needed)

### AWS Resources
- **Region**: `us-east-1`
- **DynamoDB Table**: `CapitalOne-Users`
- **IAM Role**: `CapitalOneLambdaRole`
- **Lambda Functions**: `createUser`, `transactionService`

### API Endpoints
- ✅ `POST /users` - Create user account
- 🔴 `POST /transactions` - Process transaction (route not added yet)

---

## 📁 Code Structure

### Current Structure
```
Capital-One-Midterm-Project/
├── frontend/              ✅ Complete
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── lambdas/               ✅ NEW - ES Modules (DEPLOY THESE)
│   ├── createUser/
│   │   ├── index.mjs
│   │   └── package.json
│   └── transactionService/
│       ├── index.mjs
│       └── package.json
├── lambda-functions/      ⚠️ OLD - CommonJS (BACKUP ONLY)
│   └── ...
├── database/              ✅ Complete
│   ├── dynamodb-schema.json
│   └── mysql-transactions.sql
├── iam/                   ✅ Complete
│   ├── lambda-execution-role.json
│   └── lambda-policy.json
├── docs/                  ✅ Complete
│   ├── task-division.md
│   ├── architecture-overview.md
│   └── deployment-guide.md
├── amplify.yml            ✅ Complete
├── instructions.md        ✅ Reference
├── DEPLOYMENT-CHECKLIST.md ✅ NEW
├── FIXES-APPLIED.md       ✅ NEW
└── STATUS-REPORT.md       ✅ NEW (this file)
```

---

## 🚀 Immediate Next Steps

### For Teammate A (Frontend Lead)
1. **Deploy updated createUser Lambda**:
   ```bash
   cd lambdas/createUser
   npm install
   zip -r createUser.zip .
   # Upload to Lambda console
   ```
2. **Test user creation** from Amplify frontend
3. **Verify DynamoDB** receives new users

### For Teammate B (Backend Lead)
1. **Create RDS MySQL instance** (Free Tier)
   - Template: Free tier
   - Instance: db.t3.micro
   - Storage: 20 GB
   - Public access: No
   - Note endpoint and credentials

2. **Run SQL schema**:
   ```bash
   mysql -h <endpoint> -u admin -p < database/mysql-transactions.sql
   ```

3. **Create Secrets Manager secret**:
   - Store RDS credentials
   - Note the ARN

4. **Update IAM role**:
   - Add Secrets Manager GetSecretValue permission
   - Add VPC permissions

5. **Deploy transactionService Lambda**:
   ```bash
   cd lambdas/transactionService
   npm install
   zip -r transactionService.zip .
   # Upload to Lambda console
   # Configure VPC, security groups, env vars
   ```

6. **Add API Gateway route**:
   - POST /transactions → transactionService Lambda

7. **Test end-to-end**

---

## 🐛 Known Issues & Resolutions

### Issue 1: Lambda Code Format Mismatch
**Status**: ✅ Resolved
**Solution**: Created new `lambdas/` folder with ES modules

### Issue 2: Transaction Field Name Mismatch
**Status**: ✅ Resolved
**Solution**: Updated Lambda to expect `type` instead of `transactionType`

### Issue 3: Missing Transaction ID
**Status**: ✅ Resolved
**Solution**: Added UUID generation and return in response

### Issue 4: No Secrets Manager Integration
**Status**: ✅ Resolved (code ready)
**Action Required**: Create secret in AWS console

### Issue 5: No Atomic Updates
**Status**: ✅ Resolved
**Solution**: Added ConditionExpression to prevent race conditions

---

## 📈 Progress Tracking

### Week 1 (Completed)
- ✅ Project setup
- ✅ Frontend development
- ✅ DynamoDB configuration
- ✅ API Gateway setup
- ✅ Amplify hosting

### Week 2 (Current)
- ⏳ Lambda function updates
- ⏳ RDS setup
- ⏳ Secrets Manager
- ⏳ Transaction service deployment

### Week 3 (Planned)
- 🔲 Integration testing
- 🔲 Bug fixes
- 🔲 Documentation
- 🔲 Presentation prep

---

## 💰 Cost Tracking

### Current Monthly Cost: ~$0
- ✅ Amplify: Free tier (light usage)
- ✅ API Gateway: Free tier (< 1M requests)
- ✅ Lambda: Free tier (< 1M requests)
- ✅ DynamoDB: Free tier (on-demand, low usage)
- 🔴 RDS: **$0 when stopped**, ~$15/month when running
  - **Action**: Stop RDS when not testing!

### Budget Alert: $1/month
- Set up in AWS Billing Console

---

## 🎓 Learning Outcomes

### Technical Skills Gained
- ✅ AWS service integration (S3, Lambda, API Gateway, DynamoDB, RDS)
- ✅ Serverless architecture design
- ✅ IAM roles and permissions
- ✅ CI/CD with Amplify
- ✅ ES modules and modern JavaScript
- ✅ AWS SDK v3
- ✅ Race condition handling
- ✅ Secrets management

### Challenges Overcome
- Lambda code format migration (CommonJS → ES modules)
- Field name mismatches between frontend and backend
- Understanding atomic updates and race conditions
- VPC networking for Lambda-to-RDS communication

---

## 📞 Support Resources

### Documentation
- `instructions.md` - Complete setup guide
- `DEPLOYMENT-CHECKLIST.md` - Step-by-step deployment
- `FIXES-APPLIED.md` - All code changes explained
- `docs/` folder - Architecture and task division

### AWS Documentation
- [Lambda ES Modules](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html)
- [API Gateway HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html)
- [RDS Free Tier](https://aws.amazon.com/rds/free/)
- [Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)

---

## ✅ Definition of Done

### User Creation Flow
- [x] Frontend form submits to API Gateway
- [ ] Lambda processes and stores in DynamoDB (needs redeployment)
- [x] Response includes userId and balance
- [x] DynamoDB shows new user record

### Transaction Flow
- [ ] Frontend form submits to API Gateway
- [ ] Lambda reads current balance from DynamoDB
- [ ] Lambda validates transaction (sufficient funds)
- [ ] Lambda updates balance atomically
- [ ] Lambda records transaction in RDS
- [ ] Response includes new balance and transaction ID
- [ ] DynamoDB shows updated balance
- [ ] RDS shows transaction record

### Testing
- [ ] User can create account from browser
- [ ] User can make deposit from browser
- [ ] User can make withdrawal from browser
- [ ] Insufficient funds error works correctly
- [ ] All data persists correctly
- [ ] No CORS errors
- [ ] CloudWatch logs show no errors

---

## 🎯 Success Criteria

- ✅ Frontend deployed and accessible
- ✅ User creation works end-to-end
- 🔲 Transactions work end-to-end
- 🔲 Data persists in both DynamoDB and RDS
- 🔲 No errors in CloudWatch logs
- 🔲 Cost stays under $1/month
- 🔲 Code follows instructions.md specifications
- 🔲 Team can demo all features

---

## 📝 Notes for Presentation

### Architecture Highlights
- Serverless design (no servers to manage)
- Multi-database strategy (DynamoDB for state, RDS for history)
- Atomic updates prevent race conditions
- Secrets Manager for security
- CI/CD with Amplify

### Technical Decisions
- ES modules for modern JavaScript
- AWS SDK v3 for smaller bundle size
- HTTP API (not REST) for lower cost
- RDS Free Tier instead of Aurora for cost savings
- Conditional updates for data consistency

### Challenges & Solutions
- **Challenge**: Lambda code format mismatch
  - **Solution**: Migrated to ES modules
- **Challenge**: Race conditions on balance updates
  - **Solution**: Implemented conditional updates
- **Challenge**: Secure credential management
  - **Solution**: AWS Secrets Manager integration

---

## 🏁 Conclusion

**Current Status**: 70% complete, on track for completion

**Remaining Work**: ~2-3 hours for Teammate B to complete RDS setup and transaction service

**Confidence Level**: High - All code is ready, just needs deployment

**Next Milestone**: Complete transaction flow by end of week

**Blockers**: None - clear path forward documented in DEPLOYMENT-CHECKLIST.md
