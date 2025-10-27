// index.mjs
import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import mysql from "mysql2/promise";
import { v4 as uuidv4 } from "uuid";

const ddb = new DynamoDBClient({});
const sm  = new SecretsManagerClient({});

async function getConn() {
  const sec = await sm.send(new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_ARN }));
  const { username, password, host, port, dbname } = JSON.parse(sec.SecretString);
  return mysql.createConnection({
    host: host || process.env.DB_HOST,
    port: port || 3306,
    user: username,
    password,
    database: process.env.DB_NAME || dbname,
    ssl: { rejectUnauthorized: true }
  });
}

export const handler = async (event) => {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const { userId, type, amount } = body || {};
    const amt = Number(amount);
    if (!userId || !["DEPOSIT","WITHDRAW"].includes(type) || !(amt > 0)) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid input" }) };
    }

    // 1) Read current balance
    const get = await ddb.send(new GetItemCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: { userId: { S: userId } },
      ProjectionExpression: "balance"
    }));
    if (!get.Item) return { statusCode: 404, body: JSON.stringify({ error: "User not found" }) };

    const current = Number(get.Item.balance.N);
    const change = type === "DEPOSIT" ? amt : -amt;
    const newBal = current + change;
    if (newBal < 0) return { statusCode: 400, body: JSON.stringify({ error: "Insufficient funds" }) };

    // 2) Atomic update
    const now = new Date().toISOString();
    await ddb.send(new UpdateItemCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: { userId: { S: userId } },
      UpdateExpression: "SET balance = :b, updatedAt = :u",
      ConditionExpression: "balance = :old",
      ExpressionAttributeValues: {
        ":b": { N: newBal.toFixed(2) }, ":u": { S: now }, ":old": { N: current.toFixed(2) }
      }
    }));

    // 3) Insert ledger row
    const txnId = uuidv4();
    const conn = await getConn();
    try {
      await conn.execute(
        `INSERT INTO transactions (transaction_id, user_id, transaction_type, amount, balance_after)
         VALUES (?, ?, ?, ?, ?)`,
        [txnId, userId, type, amt, newBal]
      );
    } finally { await conn.end(); }

    return { statusCode: 200, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ balance: newBal, transactionId: txnId }) };
  } catch (err) {
    console.error(err);
    if (String(err.code || err.name).includes("ConditionalCheckFailed")) {
      return { statusCode: 409, body: JSON.stringify({ error: "Balance changed; retry" }) };
    }
    return { statusCode: 500, body: JSON.stringify({ error: "Server error" }) };
  }
};
