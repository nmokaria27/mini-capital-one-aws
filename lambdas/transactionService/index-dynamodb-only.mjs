// index.mjs - Transaction service WITHOUT RDS (DynamoDB only)
// This version works without RDS for basic functionality
import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from "uuid";

const ddb = new DynamoDBClient({});

export const handler = async (event) => {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const { userId, type, amount } = body || {};
    const amt = Number(amount);
    
    if (!userId || !["DEPOSIT","WITHDRAW"].includes(type) || !(amt > 0)) {
      return { 
        statusCode: 400, 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Invalid input. Expected: userId, type (DEPOSIT/WITHDRAW), amount (positive number)" }) 
      };
    }

    // 1) Read current balance
    const get = await ddb.send(new GetItemCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: { userId: { S: userId } },
      ProjectionExpression: "balance"
    }));
    
    if (!get.Item) {
      return { 
        statusCode: 404, 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "User not found" }) 
      };
    }

    const current = Number(get.Item.balance.N);
    const change = type === "DEPOSIT" ? amt : -amt;
    const newBal = current + change;
    
    if (newBal < 0) {
      return { 
        statusCode: 400, 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Insufficient funds" }) 
      };
    }

    // 2) Atomic update
    const now = new Date().toISOString();
    await ddb.send(new UpdateItemCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: { userId: { S: userId } },
      UpdateExpression: "SET balance = :b, updatedAt = :u",
      ConditionExpression: "balance = :old",
      ExpressionAttributeValues: {
        ":b": { N: newBal.toFixed(2) }, 
        ":u": { S: now }, 
        ":old": { N: current.toFixed(2) }
      }
    }));

    // Generate transaction ID
    const txnId = uuidv4();

    // NOTE: RDS transaction logging is disabled because RDS is in different region
    // To enable: Create RDS in us-east-1 and uncomment the RDS code in index-with-rds.mjs

    return { 
      statusCode: 200, 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        balance: newBal, 
        transactionId: txnId,
        note: "Transaction recorded in DynamoDB. RDS logging disabled (cross-region)."
      }) 
    };
  } catch (err) {
    console.error("Transaction error:", err);
    
    if (String(err.code || err.name).includes("ConditionalCheckFailed")) {
      return { 
        statusCode: 409, 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Balance changed during transaction; please retry" }) 
      };
    }
    
    return { 
      statusCode: 500, 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Server error", details: err.message }) 
    };
  }
};
