// generateStatement Lambda - Generates monthly statements and uploads to S3
// Triggered by EventBridge scheduled rule (monthly)
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const ddb = new DynamoDBClient({});
const s3 = new S3Client({});

export const handler = async (event) => {
  console.log("Statement generation triggered:", JSON.stringify(event, null, 2));
  
  try {
    const now = new Date();
    const statementMonth = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const statementDate = now.toISOString().split('T')[0];
    
    // Scan all users from DynamoDB
    const scanResult = await ddb.send(new ScanCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME,
      ProjectionExpression: "userId, fullName, email, balance, transactionHistory, createdAt"
    }));
    
    const users = scanResult.Items || [];
    console.log(`Found ${users.length} users for statement generation`);
    
    const generatedStatements = [];
    
    for (const user of users) {
      const userId = user.userId?.S;
      const fullName = user.fullName?.S || 'Customer';
      const email = user.email?.S || 'N/A';
      const balance = Number(user.balance?.N || 0).toFixed(2);
      const createdAt = user.createdAt?.S || 'N/A';
      
      // Parse transaction history (stored as list in DynamoDB)
      let transactions = [];
      if (user.transactionHistory?.L) {
        transactions = user.transactionHistory.L.map(item => {
          const tx = item.M;
          return {
            type: tx.type?.S || 'N/A',
            amount: Number(tx.amount?.N || 0).toFixed(2),
            balanceAfter: Number(tx.balanceAfter?.N || 0).toFixed(2),
            timestamp: tx.timestamp?.S || 'N/A'
          };
        });
      }
      
      // Generate HTML statement
      const statementHtml = generateStatementHtml({
        userId,
        fullName,
        email,
        balance,
        createdAt,
        transactions,
        statementMonth,
        statementDate
      });
      
      // Upload to S3
      const s3Key = `statements/${userId}/${statementDate}-statement.html`;
      
      await s3.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: s3Key,
        Body: statementHtml,
        ContentType: 'text/html',
        Metadata: {
          userId: userId,
          generatedAt: now.toISOString()
        }
      }));
      
      console.log(`Statement uploaded for user ${userId}: ${s3Key}`);
      generatedStatements.push({ userId, s3Key });
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Generated ${generatedStatements.length} statements`,
        statements: generatedStatements
      })
    };
  } catch (err) {
    console.error("Error generating statements:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};

function generateStatementHtml({ userId, fullName, email, balance, createdAt, transactions, statementMonth, statementDate }) {
  const transactionRows = transactions.length > 0 
    ? transactions.map(tx => `
        <tr>
          <td>${new Date(tx.timestamp).toLocaleDateString()}</td>
          <td>${tx.type}</td>
          <td class="${tx.type === 'DEPOSIT' ? 'deposit' : 'withdraw'}">
            ${tx.type === 'DEPOSIT' ? '+' : '-'}$${tx.amount}
          </td>
          <td>$${tx.balanceAfter}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="4" style="text-align: center;">No transactions this period</td></tr>';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Account Statement - ${statementMonth}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
    .container { max-width: 800px; margin: 20px auto; background: white; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #004977 0%, #006bb3 100%); color: white; padding: 30px; }
    .header h1 { font-size: 28px; margin-bottom: 5px; }
    .header p { opacity: 0.9; }
    .statement-info { display: flex; justify-content: space-between; padding: 20px 30px; background: #f9f9f9; border-bottom: 1px solid #eee; }
    .info-block h3 { color: #004977; font-size: 14px; text-transform: uppercase; margin-bottom: 5px; }
    .info-block p { font-size: 16px; }
    .account-summary { padding: 30px; }
    .account-summary h2 { color: #004977; margin-bottom: 20px; border-bottom: 2px solid #004977; padding-bottom: 10px; }
    .balance-box { background: linear-gradient(135deg, #004977 0%, #006bb3 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    .balance-box .label { font-size: 14px; opacity: 0.9; }
    .balance-box .amount { font-size: 36px; font-weight: bold; }
    .transactions { padding: 0 30px 30px; }
    .transactions h2 { color: #004977; margin-bottom: 20px; border-bottom: 2px solid #004977; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #004977; color: white; padding: 12px; text-align: left; }
    td { padding: 12px; border-bottom: 1px solid #eee; }
    tr:hover { background: #f9f9f9; }
    .deposit { color: #28a745; font-weight: bold; }
    .withdraw { color: #dc3545; font-weight: bold; }
    .footer { text-align: center; padding: 20px; background: #f9f9f9; font-size: 12px; color: #666; }
    @media print {
      body { background: white; }
      .container { box-shadow: none; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Capital One</h1>
      <p>Monthly Account Statement</p>
    </div>
    
    <div class="statement-info">
      <div class="info-block">
        <h3>Account Holder</h3>
        <p>${fullName}</p>
        <p>${email}</p>
      </div>
      <div class="info-block">
        <h3>Statement Period</h3>
        <p>${statementMonth}</p>
        <p>Generated: ${statementDate}</p>
      </div>
      <div class="info-block">
        <h3>Account ID</h3>
        <p>${userId.substring(0, 8)}...</p>
        <p>Since: ${new Date(createdAt).toLocaleDateString()}</p>
      </div>
    </div>
    
    <div class="account-summary">
      <h2>Account Summary</h2>
      <div class="balance-box">
        <div class="label">Current Balance</div>
        <div class="amount">$${balance}</div>
      </div>
    </div>
    
    <div class="transactions">
      <h2>Recent Transactions</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Balance After</th>
          </tr>
        </thead>
        <tbody>
          ${transactionRows}
        </tbody>
      </table>
    </div>
    
    <div class="footer">
      <p>This statement was automatically generated by Capital One Banking System.</p>
      <p>CMSC398P AWS Cloud Computing Project</p>
      <p>For questions, please contact support.</p>
    </div>
  </div>
</body>
</html>
  `;
}
