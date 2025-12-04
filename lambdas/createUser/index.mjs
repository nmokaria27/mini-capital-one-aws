// index.mjs - Create user with email notification preferences
// Updated for Final Project: Added emailNotifications field
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from "uuid";

const ddb = new DynamoDBClient({});

export const handler = async (event) => {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const { fullName, dob, email, initialBalance, emailNotifications = true } = body || {};
    
    if (!fullName || !dob || !email || initialBalance == null) {
      return { 
        statusCode: 400, 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing fields. Required: fullName, dob, email, initialBalance" }) 
      };
    }
    
    const userId = uuidv4();
    const now = new Date().toISOString();
    
    await ddb.send(new PutItemCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: {
        userId: { S: userId },
        fullName: { S: fullName },
        dob: { S: dob },
        email: { S: email },
        balance: { N: Number(initialBalance).toFixed(2) },
        emailNotifications: { BOOL: Boolean(emailNotifications) },
        transactionHistory: { L: [] },  // Initialize empty transaction history
        createdAt: { S: now },
        updatedAt: { S: now }
      },
      ConditionExpression: "attribute_not_exists(userId)"
    }));
    
    console.log("User created:", userId, "Email notifications:", emailNotifications);
    
    return { 
      statusCode: 200, 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        userId, 
        balance: Number(initialBalance),
        emailNotifications: Boolean(emailNotifications)
      }) 
    };
  } catch (err) {
    console.error("Create user error:", err);
    return { 
      statusCode: 500, 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Server error", details: err.message }) 
    };
  }
};
