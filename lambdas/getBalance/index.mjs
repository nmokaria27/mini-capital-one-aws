// index.mjs - Get user balance from DynamoDB
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";

const ddb = new DynamoDBClient({});

export const handler = async (event) => {
  try {
    // Extract userId from path parameters or query string
    const userId = event.pathParameters?.userId || event.queryStringParameters?.userId;
    
    if (!userId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing userId parameter" })
      };
    }

    // Get user from DynamoDB
    const result = await ddb.send(new GetItemCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: { userId: { S: userId } },
      ProjectionExpression: "userId, fullName, email, balance, updatedAt"
    }));

    if (!result.Item) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "User not found" })
      };
    }

    // Parse DynamoDB response
    const user = {
      userId: result.Item.userId.S,
      fullName: result.Item.fullName.S,
      email: result.Item.email.S,
      balance: Number(result.Item.balance.N),
      updatedAt: result.Item.updatedAt.S
    };

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user)
    };
  } catch (err) {
    console.error("Error fetching balance:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Server error" })
    };
  }
};
