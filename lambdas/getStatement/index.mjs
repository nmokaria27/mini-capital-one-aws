// getStatement Lambda - Generates an on-demand statement and returns a pre-signed S3 URL
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({});
const ddb = new DynamoDBClient({});

export const handler = async (event) => {
  try {
    // Extract userId from path parameters
    const userId = event.pathParameters?.userId;

    if (!userId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing userId parameter" })
      };
    }

    const bucketName = process.env.S3_BUCKET_NAME;
    const tableName = process.env.DYNAMODB_TABLE_NAME;

    if (!bucketName || !tableName) {
      console.error("Missing env vars", { bucketName, tableName });
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Server error", details: "S3_BUCKET_NAME or DYNAMODB_TABLE_NAME not configured" })
      };
    }

    // Fetch latest user data from DynamoDB
    const result = await ddb.send(new GetItemCommand({
      TableName: tableName,
      Key: { userId: { S: userId } },
      ProjectionExpression: "userId, fullName, email, balance, transactionHistory, createdAt"
    }));

    if (!result.Item) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "User not found" })
      };
    }

    const now = new Date();
    const statementMonth = now.toLocaleString("en-US", { month: "long", year: "numeric" });
    const statementDate = now.toISOString().split("T")[0];

    const user = result.Item;
    const fullName = user.fullName?.S || "Customer";
    const email = user.email?.S || "N/A";
    const balance = Number(user.balance?.N || 0).toFixed(2);
    const createdAt = user.createdAt?.S || "N/A";

    // Parse transaction history (stored as list in DynamoDB)
    let transactions = [];
    if (user.transactionHistory?.L) {
      transactions = user.transactionHistory.L.map((item) => {
        const tx = item.M;
        return {
          type: tx.type?.S || "N/A",
          amount: Number(tx.amount?.N || 0).toFixed(2),
          balanceAfter: Number(tx.balanceAfter?.N || 0).toFixed(2),
          timestamp: tx.timestamp?.S || now.toISOString()
        };
      });
    }

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

    // Use timestamp in key to avoid collisions
    const safeTimestamp = now.toISOString().replace(/[:.]/g, "-");
    const s3Key = `statements/${userId}/${safeTimestamp}-statement.html`;

    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: statementHtml,
      ContentType: "text/html",
      Metadata: {
        userId,
        generatedAt: now.toISOString()
      }
    }));

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: s3Key
    });

    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latestStatement: {
          url: presignedUrl,
          key: s3Key,
          generatedAt: now.toISOString(),
          expiresIn: "1 hour"
        },
        availableStatements: [
          {
            key: s3Key,
            date: statementDate,
            lastModified: now.toISOString()
          }
        ]
      })
    };
  } catch (err) {
    console.error("Error generating on-demand statement:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Server error", details: err.message })
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
      <p>Account Statement</p>
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
