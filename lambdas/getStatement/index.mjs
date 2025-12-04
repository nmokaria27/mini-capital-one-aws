// getStatement Lambda - Returns pre-signed S3 URL for statement download
import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({});

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
    const prefix = `statements/${userId}/`;
    
    // List all statements for this user
    const listResult = await s3.send(new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      MaxKeys: 10
    }));
    
    if (!listResult.Contents || listResult.Contents.length === 0) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          error: "No statements found",
          message: "Statements are generated monthly. Please check back after the 1st of next month."
        })
      };
    }
    
    // Sort by LastModified to get the most recent statement
    const sortedStatements = listResult.Contents.sort((a, b) => 
      new Date(b.LastModified) - new Date(a.LastModified)
    );
    
    const latestStatement = sortedStatements[0];
    
    // Generate pre-signed URL (valid for 1 hour)
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: latestStatement.Key
    });
    
    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    
    // Also return list of all available statements
    const availableStatements = sortedStatements.map(s => ({
      key: s.Key,
      date: s.Key.split('/').pop().replace('-statement.html', ''),
      lastModified: s.LastModified,
      size: s.Size
    }));
    
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latestStatement: {
          url: presignedUrl,
          key: latestStatement.Key,
          generatedAt: latestStatement.LastModified,
          expiresIn: "1 hour"
        },
        availableStatements: availableStatements
      })
    };
  } catch (err) {
    console.error("Error getting statement:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Server error", details: err.message })
    };
  }
};
