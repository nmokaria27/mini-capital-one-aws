const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const mysql = require('mysql2/promise');

// Aurora RDS connection configuration
const dbConfig = {
    host: process.env.RDS_HOST,
    user: process.env.RDS_USER,
    password: process.env.RDS_PASSWORD,
    database: process.env.RDS_DATABASE
};

exports.handler = async (event) => {
    let connection;
    
    try {
        // Parse request body
        const body = JSON.parse(event.body);
        const { userId, transactionType, amount } = body;

        // Validate input
        if (!userId || !transactionType || !amount) {
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

        const transactionAmount = parseFloat(amount);

        // Get current user data from DynamoDB
        const getUserParams = {
            TableName: process.env.DYNAMODB_TABLE_NAME,
            Key: { userId: userId }
        };

        const userData = await dynamodb.get(getUserParams).promise();

        if (!userData.Item) {
            return {
                statusCode: 404,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: 'User not found'
                })
            };
        }

        let currentBalance = userData.Item.balance;
        let newBalance;

        // Calculate new balance
        if (transactionType === 'deposit') {
            newBalance = currentBalance + transactionAmount;
        } else if (transactionType === 'withdrawal') {
            if (currentBalance < transactionAmount) {
                return {
                    statusCode: 400,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: 'Insufficient funds'
                    })
                };
            }
            newBalance = currentBalance - transactionAmount;
        } else {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: 'Invalid transaction type'
                })
            };
        }

        // Update balance in DynamoDB
        const updateParams = {
            TableName: process.env.DYNAMODB_TABLE_NAME,
            Key: { userId: userId },
            UpdateExpression: 'SET balance = :newBalance, updatedAt = :timestamp',
            ExpressionAttributeValues: {
                ':newBalance': newBalance,
                ':timestamp': new Date().toISOString()
            }
        };

        await dynamodb.update(updateParams).promise();

        // Record transaction in Aurora RDS
        connection = await mysql.createConnection(dbConfig);
        
        const insertQuery = `
            INSERT INTO transactions (user_id, transaction_type, amount, balance_after, transaction_date)
            VALUES (?, ?, ?, ?, NOW())
        `;
        
        await connection.execute(insertQuery, [
            userId,
            transactionType,
            transactionAmount,
            newBalance
        ]);

        await connection.end();

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Transaction successful',
                transactionType: transactionType,
                amount: transactionAmount,
                newBalance: newBalance
            })
        };

    } catch (error) {
        console.error('Error:', error);
        
        if (connection) {
            await connection.end();
        }

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
