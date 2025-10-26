const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require('uuid');

exports.handler = async (event) => {
    try {
        // Parse request body
        const body = JSON.parse(event.body);
        const { fullName, dob, email, initialBalance } = body;

        // Validate input
        if (!fullName || !dob || !email || initialBalance === undefined) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: 'Missing required fields'
                })
            };
        }

        // Generate unique user ID
        const userId = uuidv4();
        const timestamp = new Date().toISOString();

        // Create user object
        const user = {
            userId: userId,
            fullName: fullName,
            dob: dob,
            email: email,
            balance: parseFloat(initialBalance),
            createdAt: timestamp,
            updatedAt: timestamp
        };

        // Save to DynamoDB
        const params = {
            TableName: process.env.DYNAMODB_TABLE_NAME,
            Item: user
        };

        await dynamodb.put(params).promise();

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'User created successfully',
                userId: userId,
                balance: initialBalance
            })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Internal server error',
                error: error.message
            })
        };
    }
};
