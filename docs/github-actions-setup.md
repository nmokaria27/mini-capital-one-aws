# GitHub Actions CI/CD Setup

## Overview
This workflow automatically deploys your frontend to S3 whenever you push to the `main` branch.

## Setup Instructions

### 1. Create GitHub Repository Secrets
Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add the following secrets:

- **AWS_ACCESS_KEY_ID**: Your AWS access key ID
- **AWS_SECRET_ACCESS_KEY**: Your AWS secret access key
- **AWS_REGION**: Your AWS region (e.g., `us-east-1`)

### 2. Get AWS Credentials
```bash
# If you don't have AWS credentials yet:
# 1. Go to AWS Console → IAM → Users
# 2. Create a new user or select existing user
# 3. Go to Security Credentials tab
# 4. Create Access Key → Choose "Application running outside AWS"
# 5. Copy the Access Key ID and Secret Access Key
```

### 3. IAM Permissions Required
Your AWS user needs the following S3 permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:PutObjectAcl"
      ],
      "Resource": [
        "arn:aws:s3:::capitalone-banking-app-neel",
        "arn:aws:s3:::capitalone-banking-app-neel/*"
      ]
    }
  ]
}
```

### 4. S3 Bucket Configuration
Make sure your S3 bucket is configured for static website hosting:
```bash
# Enable static website hosting
aws s3 website s3://capitalone-banking-app-neel --index-document index.html

# Set bucket policy for public read access
aws s3api put-bucket-policy --bucket capitalone-banking-app-neel --policy '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::capitalone-banking-app-neel/*"
    }
  ]
}'
```

### 5. Workflow Trigger
The workflow will automatically run when you:
```bash
git add .
git commit -m "Update frontend"
git push origin main
```

### 6. Monitor Deployment
- Go to your GitHub repository → Actions tab
- Click on the latest workflow run
- Monitor the deployment progress
- Check for any errors

### 7. Access Your Website
After successful deployment, access your site at:
```
http://capitalone-banking-app-neel.s3-website-[region].amazonaws.com
```

Replace `[region]` with your AWS region (e.g., `us-east-1`).

## Workflow Details

### What It Does:
1. **Checkout repo**: Clones your repository code
2. **Sync files to S3**: Uploads all files from `frontend/` directory to S3
   - `--acl public-read`: Makes files publicly accessible
   - `--follow-symlinks`: Follows symbolic links
   - `--delete`: Removes files from S3 that don't exist locally

### Customization:
- **Change branch**: Modify `branches: [ main ]` to your default branch
- **Change source directory**: Modify `SOURCE_DIR: frontend` if your files are in a different folder
- **Change bucket name**: Already set to `capitalone-banking-app-neel`

## Troubleshooting

### Error: "Access Denied"
- Check that your AWS credentials are correct in GitHub Secrets
- Verify IAM user has S3 permissions

### Error: "Bucket does not exist"
- Create the S3 bucket first: `aws s3 mb s3://capitalone-banking-app-neel`

### Files not updating
- Check that `--delete` flag is present in the workflow
- Clear browser cache
- Check S3 bucket contents in AWS Console

## Security Best Practices
- ✅ Never commit AWS credentials to your repository
- ✅ Use GitHub Secrets for sensitive data
- ✅ Use IAM user with minimal required permissions
- ✅ Rotate AWS access keys regularly
- ✅ Enable MFA on AWS account
