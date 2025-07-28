import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
    try {
        const customerPhone = event?.Details?.ContactData?.CustomerEndpoint?.Address;

        const params = {
            TableName: 'Customers',
            IndexName: 'phoneNumber-index',
            KeyConditionExpression: '#attributeName = :attributeValue',
            ExpressionAttributeNames: {
                '#attributeName': 'phoneNumber'
            },
            ExpressionAttributeValues: {
                ':attributeValue': customerPhone
            }
        };

        const result = await ddbDocClient.send(new QueryCommand(params));

        const greeting = (result.Items && result.Items.length > 0)
            ? `Hello ${result.Items[0].firstName}, Thank you for calling Hemjyoti IT consulting services`
            : `Thank you for calling Hemjyoti IT consulting services`;

        console.log('Event:', JSON.stringify(event));

        return {
            statusCode: 200,
            body: greeting
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: 'Internal Server Error'
        };
    }
};
