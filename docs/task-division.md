# Task Division for 2-Person Team

## Team Member 1: Frontend & User Management

### Responsibilities:

#### 1. Frontend Development (S3 Static Website)
- [ ] Enhance HTML/CSS/JavaScript interface
- [ ] Implement form validation
- [ ] Add error handling and user feedback
- [ ] Test frontend locally before S3 deployment
- [ ] Create S3 bucket and configure static website hosting
- [ ] Upload frontend files to S3
- [ ] Configure bucket policies for public access
- [ ] Test S3 hosted website

#### 2. User Management Lambda Function
- [ ] Review and test `createUser` Lambda function code
- [ ] Set up Lambda function in AWS Console
- [ ] Configure environment variables (DynamoDB table name)
- [ ] Set up IAM role with DynamoDB permissions
- [ ] Create API Gateway endpoint for user creation
- [ ] Test Lambda function with sample data
- [ ] Integrate API Gateway URL into frontend

#### 3. DynamoDB Setup
- [ ] Create DynamoDB table using provided schema
- [ ] Configure table settings (on-demand billing)
- [ ] Test table with sample data
- [ ] Document table structure and attributes

#### 4. Documentation
- [ ] Document S3 setup process
- [ ] Document DynamoDB configuration
- [ ] Create user guide for frontend interface
- [ ] Document API endpoints

---

## Team Member 2: Backend & Transaction Processing

### Responsibilities:

#### 1. Transaction Lambda Function
- [ ] Review and test `transactionService` Lambda function code
- [ ] Set up Lambda function in AWS Console
- [ ] Configure environment variables (DynamoDB table, RDS credentials)
- [ ] Set up VPC configuration for RDS access
- [ ] Set up IAM role with DynamoDB and RDS permissions
- [ ] Create API Gateway endpoint for transactions
- [ ] Test Lambda function with sample transactions
- [ ] Integrate API Gateway URL into frontend

#### 2. Aurora Serverless RDS Setup
- [ ] Create Aurora Serverless cluster
- [ ] Configure VPC and security groups
- [ ] Run SQL schema to create transactions table
- [ ] Set up database credentials in Secrets Manager
- [ ] Test database connectivity from Lambda
- [ ] Document RDS configuration

#### 3. IAM Configuration
- [ ] Create Lambda execution roles
- [ ] Attach necessary policies for DynamoDB access
- [ ] Attach necessary policies for RDS access
- [ ] Configure VPC permissions for Lambda
- [ ] Set up API Gateway permissions
- [ ] Document IAM setup

#### 4. Integration & Testing
- [ ] Test end-to-end flow: User creation → Transaction → Balance update
- [ ] Verify data consistency between DynamoDB and RDS
- [ ] Test error scenarios (insufficient funds, invalid users)
- [ ] Performance testing
- [ ] Create test cases documentation

---

## Shared Responsibilities

### Both Team Members:
- [ ] Initial project setup and Git repository
- [ ] Regular sync meetings to discuss progress
- [ ] Code reviews for each other's work
- [ ] Final integration testing
- [ ] Project presentation preparation
- [ ] Final documentation review

---

## Timeline Suggestion

### Week 1:
- **Member 1**: S3 setup, DynamoDB creation, basic frontend
- **Member 2**: Aurora RDS setup, IAM configuration

### Week 2:
- **Member 1**: User creation Lambda, API Gateway integration
- **Member 2**: Transaction Lambda, database connectivity

### Week 3:
- **Both**: Integration testing, bug fixes, documentation

### Week 4:
- **Both**: Final testing, presentation prep, submission

---

## Communication Checkpoints

1. **Daily**: Quick status updates (Slack/Discord)
2. **Every 2-3 days**: Sync meeting to discuss blockers
3. **Weekly**: Code review and integration testing
4. **Before submission**: Final review together

---

## Tips for Success

- **Use Git branches**: Each member works on their own branch
- **Commit often**: Small, frequent commits with clear messages
- **Test locally first**: Before deploying to AWS
- **Document as you go**: Don't leave documentation for the end
- **Ask for help**: Use LLMs, AWS documentation, and each other
- **Start early**: AWS setup can take time due to propagation delays
