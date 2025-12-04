// index.mjs - Transaction service with SNS notifications
// Updated for Final Project: Publishes transaction events to SNS
import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { v4 as uuidv4 } from "uuid";

const sns = new SNSClient({});

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

    // Get user details for notification
    const userDetails = await ddb.send(new GetItemCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: { userId: { S: userId } },
      ProjectionExpression: "email, fullName, emailNotifications"
    }));

    // Store transaction in history (for statement generation)
    try {
      await ddb.send(new UpdateItemCommand({
        TableName: process.env.DYNAMODB_TABLE_NAME,
        Key: { userId: { S: userId } },
        UpdateExpression: "SET transactionHistory = list_append(if_not_exists(transactionHistory, :empty), :tx)",
        ExpressionAttributeValues: {
          ":empty": { L: [] },
          ":tx": { L: [{
            M: {
              type: { S: type },
              amount: { N: amt.toFixed(2) },
              balanceAfter: { N: newBal.toFixed(2) },
              timestamp: { S: now },
              transactionId: { S: txnId }
            }
          }]}
        }
      }));
    } catch (historyErr) {
      console.warn("Failed to update transaction history:", historyErr);
      // Don't fail the transaction if history update fails
    }

    // Publish to SNS for email notification (if enabled)
    const emailNotificationsEnabled = userDetails.Item?.emailNotifications?.BOOL !== false;
    const userEmail = userDetails.Item?.email?.S;
    const fullName = userDetails.Item?.fullName?.S;

    if (process.env.SNS_TOPIC_ARN && emailNotificationsEnabled && userEmail) {
      try {
        await sns.send(new PublishCommand({
          TopicArn: process.env.SNS_TOPIC_ARN,
          Message: JSON.stringify({
            userId,
            email: userEmail,
            fullName,
            transactionType: type,
            amount: amt,
            newBalance: newBal,
            timestamp: now,
            transactionId: txnId
          }),
          Subject: `Capital One: ${type} Transaction Alert`
        }));
        console.log("SNS notification published for user:", userId);
      } catch (snsErr) {
        console.warn("Failed to publish SNS notification:", snsErr);
        // Don't fail the transaction if notification fails
      }
    }

    return { 
      statusCode: 200, 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        balance: newBal, 
        transactionId: txnId,
        notificationSent: emailNotificationsEnabled && !!userEmail
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
