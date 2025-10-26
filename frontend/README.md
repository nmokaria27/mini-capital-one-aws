# Frontend - S3 Static Website

## Files
- `index.html` - Main HTML structure
- `styles.css` - Styling with Capital One branding
- `app.js` - JavaScript for API interactions

## Features
1. **User Registration Form**
   - Full Name, DOB, Email, Initial Balance
   - Creates new user account

2. **Transaction Form**
   - Deposit or Withdrawal
   - Updates balance and records transaction

3. **Balance Checker**
   - Query user balance by User ID

## Setup
1. Update API Gateway URLs in `app.js`
2. Test locally by opening `index.html` in browser
3. Upload to S3 bucket
4. Enable static website hosting
5. Set bucket policy for public access

## Local Testing
Open `index.html` in a web browser. Note: API calls will fail until Lambda functions are deployed and URLs are updated.
