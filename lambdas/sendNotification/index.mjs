// sendNotification Lambda - Receives SNS events and sends emails via SES
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({});

export const handler = async (event) => {
  console.log("Received SNS event:", JSON.stringify(event, null, 2));
  
  try {
    // SNS sends records as an array
    for (const record of event.Records) {
      const message = JSON.parse(record.Sns.Message);
      
      const { 
        userId, 
        email, 
        transactionType, 
        amount, 
        newBalance, 
        timestamp,
        fullName 
      } = message;
      
      // Skip if no email or notifications disabled
      if (!email) {
        console.log("No email provided, skipping notification");
        continue;
      }
      
      const formattedAmount = Number(amount).toFixed(2);
      const formattedBalance = Number(newBalance).toFixed(2);
      const formattedDate = new Date(timestamp).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      
      const isDeposit = transactionType === 'DEPOSIT';
      const transactionVerb = isDeposit ? 'deposited into' : 'withdrawn from';
      const transactionColor = isDeposit ? '#28a745' : '#dc3545';
      
      const emailParams = {
        Source: process.env.SENDER_EMAIL,
        Destination: {
          ToAddresses: [email]
        },
        Message: {
          Subject: {
            Data: `Capital One: ${transactionType} of $${formattedAmount} - Transaction Alert`,
            Charset: 'UTF-8'
          },
          Body: {
            Html: {
              Data: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #004977; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .transaction-box { background: white; border-left: 4px solid ${transactionColor}; padding: 15px; margin: 15px 0; }
    .amount { font-size: 24px; font-weight: bold; color: ${transactionColor}; }
    .balance { font-size: 18px; color: #004977; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Capital One</h1>
      <p>Transaction Alert</p>
    </div>
    <div class="content">
      <p>Hello ${fullName || 'Valued Customer'},</p>
      <p>A transaction has been ${transactionVerb} your account.</p>
      
      <div class="transaction-box">
        <p><strong>Transaction Type:</strong> ${transactionType}</p>
        <p class="amount">${isDeposit ? '+' : '-'}$${formattedAmount}</p>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Transaction ID:</strong> ${userId.substring(0, 8)}...</p>
      </div>
      
      <p class="balance"><strong>New Balance:</strong> $${formattedBalance}</p>
      
      <p>If you did not authorize this transaction, please contact us immediately.</p>
    </div>
    <div class="footer">
      <p>This is an automated message from Capital One Banking System.</p>
      <p>CMSC398P AWS Cloud Computing Project</p>
    </div>
  </div>
</body>
</html>
              `,
              Charset: 'UTF-8'
            },
            Text: {
              Data: `
Capital One Transaction Alert

Hello ${fullName || 'Valued Customer'},

A ${transactionType.toLowerCase()} of $${formattedAmount} has been ${transactionVerb} your account.

Transaction Details:
- Type: ${transactionType}
- Amount: $${formattedAmount}
- Date: ${formattedDate}
- New Balance: $${formattedBalance}

If you did not authorize this transaction, please contact us immediately.

This is an automated message from Capital One Banking System.
              `,
              Charset: 'UTF-8'
            }
          }
        }
      };
      
      console.log("Sending email to:", email);
      await ses.send(new SendEmailCommand(emailParams));
      console.log("Email sent successfully to:", email);
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Notifications sent successfully" })
    };
  } catch (err) {
    console.error("Error sending notification:", err);
    // Don't throw - we don't want to retry failed emails
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
