// index.mjs
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from "uuid";
const ddb = new DynamoDBClient({});

export const handler = async (event) => {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const { fullName, dob, email, initialBalance } = body || {};
    if (!fullName || !dob || !email || initialBalance == null) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing fields" }) };
    }
    const userId = uuidv4();
    const now = new Date().toISOString();
    await ddb.send(new PutItemCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: {
        userId: { S: userId }, fullName: { S: fullName }, dob: { S: dob }, email: { S: email },
        balance: { N: Number(initialBalance).toFixed(2) }, createdAt: { S: now }, updatedAt: { S: now }
      },
      ConditionExpression: "attribute_not_exists(userId)"
    }));
    return { statusCode: 200, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, balance: Number(initialBalance) }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: "Server error" }) };
  }
};
