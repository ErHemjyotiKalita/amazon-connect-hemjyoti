# 🚀 Quick Reference Guide

## Overview
Fast reference for common operations, code snippets, and configurations for the Hemjyoti IT Consulting Contact Center system.

---

## 🔧 Lambda Function Quick Start

### Basic Handler Pattern
```javascript
export const handler = async (event) => {
    try {
        const customerPhone = event?.Details?.ContactData?.CustomerEndpoint?.Address;
        const customer = await getCustomer(customerPhone);
        return { statusCode: 200, body: createGreeting(customer) };
    } catch (error) {
        console.error('Error:', error);
        return { statusCode: 500, body: 'Internal Server Error' };
    }
};
```

### DynamoDB Query Snippets
```javascript
// Quick customer lookup
const getCustomer = async (phone) => {
    const params = {
        TableName: 'Customers',
        IndexName: 'phoneNumber-index',
        KeyConditionExpression: 'phoneNumber = :phone',
        ExpressionAttributeValues: { ':phone': phone }
    };
    const result = await ddbDocClient.send(new QueryCommand(params));
    return result.Items?.[0];
};

// Batch operations
const getMultipleCustomers = async (customerIds) => {
    const params = {
        RequestItems: {
            'Customers': {
                Keys: customerIds.map(id => ({ CustomerId: id }))
            }
        }
    };
    return await ddbDocClient.send(new BatchGetCommand(params));
};
```

---

## 📞 Contact Flow Quick Configs

### Lambda Invocation Block
```json
{
  "Type": "InvokeLambdaFunction",
  "Parameters": {
    "LambdaFunctionARN": "arn:aws:lambda:us-east-1:account:function:MyFirstLambda",
    "InvocationTimeLimitSeconds": "3"
  },
  "Transitions": {
    "NextAction": "next-step",
    "Errors": [{"ErrorType": "NoMatchingError", "NextAction": "error-handler"}]
  }
}
```

### Play Prompt Block
```json
{
  "Type": "MessageParticipant",
  "Parameters": {
    "Text": "$.External.greeting"
  },
  "Transitions": {
    "NextAction": "transfer-to-queue"
  }
}
```

### Transfer to Queue
```json
{
  "Type": "TransferContactToQueue",
  "Parameters": {
    "QueueId": "arn:aws:connect:us-east-1:account:queue/basic-queue"
  }
}
```

---

## 🤖 Lex Bot Quick Setup

### Intent Configuration
```json
{
  "name": "PaymentIntent",
  "sampleUtterances": [
    {"utterance": "I want to make a payment"},
    {"utterance": "Help me pay my bill"}
  ],
  "slots": [
    {
      "slotName": "FirstName",
      "slotTypeId": "AMAZON.FirstName",
      "valueElicitationSetting": {
        "slotConstraint": "Required",
        "promptSpecification": {
          "messageGroupsList": [
            {
              "message": {
                "plainTextMessage": {"value": "What's your first name?"}
              }
            }
          ]
        }
      }
    }
  ]
}
```

### Bot Response Templates
```javascript
// Success response
{
  "sessionState": {
    "intent": { "name": "payment", "state": "Fulfilled" }
  },
  "messages": [
    {
      "contentType": "PlainText",
      "content": "Thank you! Connecting you to an agent."
    }
  ]
}

// Slot elicitation
{
  "sessionState": {
    "intent": { "name": "payment", "state": "InProgress" },
    "dialogAction": { "type": "ElicitSlot", "slotToElicit": "FirstName" }
  },
  "messages": [
    {
      "contentType": "PlainText", 
      "content": "What's your first name?"
    }
  ]
}
```

---

## 🗄️ DynamoDB Quick Operations

### Table Creation
```bash
aws dynamodb create-table \
  --table-name Customers \
  --attribute-definitions \
    AttributeName=CustomerId,AttributeType=S \
    AttributeName=phoneNumber,AttributeType=S \
  --key-schema AttributeName=CustomerId,KeyType=HASH \
  --global-secondary-indexes file://gsi-config.json \
  --billing-mode PAY_PER_REQUEST
```

### GSI Configuration (gsi-config.json)
```json
[
  {
    "IndexName": "phoneNumber-index",
    "KeySchema": [
      {"AttributeName": "phoneNumber", "KeyType": "HASH"}
    ],
    "Projection": {"ProjectionType": "ALL"}
  }
]
```

### Common Queries
```javascript
// Find by phone
const byPhone = {
  TableName: 'Customers',
  IndexName: 'phoneNumber-index',
  KeyConditionExpression: 'phoneNumber = :phone',
  ExpressionAttributeValues: { ':phone': '+1234567890' }
};

// Update customer
const updateCustomer = {
  TableName: 'Customers',
  Key: { CustomerId: 'HK4463' },
  UpdateExpression: 'SET firstName = :name',
  ExpressionAttributeValues: { ':name': 'NewName' },
  ReturnValues: 'ALL_NEW'
};

// Conditional put
const putCustomer = {
  TableName: 'Customers',
  Item: { CustomerId: 'HK4464', phoneNumber: '+1234567891' },
  ConditionExpression: 'attribute_not_exists(CustomerId)'
};
```

---

## 📊 CloudWatch Quick Setup

### Basic Alarms
```bash
# Lambda error alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "MyFirstLambda-Errors" \
  --alarm-description "Lambda function errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --dimensions Name=FunctionName,Value=MyFirstLambda \
  --evaluation-periods 1

# Lambda duration alarm  
aws cloudwatch put-metric-alarm \
  --alarm-name "MyFirstLambda-Duration" \
  --metric-name Duration \
  --namespace AWS/Lambda \
  --statistic Average \
  --period 300 \
  --threshold 2000 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=MyFirstLambda \
  --evaluation-periods 2
```

### Custom Metrics in Lambda
```javascript
import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";

const cloudwatch = new CloudWatchClient({});

const publishMetric = async (name, value, unit = 'Count') => {
  await cloudwatch.send(new PutMetricDataCommand({
    Namespace: 'Hemjyoti/ContactCenter',
    MetricData: [{
      MetricName: name,
      Value: value,
      Unit: unit,
      Timestamp: new Date()
    }]
  }));
};

// Usage
await publishMetric('CustomerFound', 1);
await publishMetric('ResponseTime', 150, 'Milliseconds');
```

---

## 🚀 Deployment Commands

### SAM Deployment
```bash
# Build and deploy
sam build
sam deploy --guided

# Deploy with parameters
sam deploy \
  --parameter-overrides \
    Environment=prod \
    TableName=Customers \
  --capabilities CAPABILITY_IAM
```

### Direct AWS CLI
```bash
# Deploy Lambda
aws lambda create-function \
  --function-name MyFirstLambda \
  --runtime nodejs22.x \
  --role arn:aws:iam::account:role/lambda-execution-role \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 3 \
  --memory-size 128

# Update function code
aws lambda update-function-code \
  --function-name MyFirstLambda \
  --zip-file fileb://updated-function.zip

# Create contact flow
aws connect create-contact-flow \
  --instance-id your-instance-id \
  --name "Inbound Call Flow" \
  --type CONTACT_FLOW \
  --content file://inbound-flow.json
```

---

## 🔍 Debugging & Troubleshooting

### Lambda Logs
```bash
# View recent logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/MyFirstLambda \
  --start-time $(date -d '1 hour ago' +%s)000

# Follow logs real-time
aws logs tail /aws/lambda/MyFirstLambda --follow
```

### Contact Flow Logs
```bash
# View contact flow execution logs
aws logs filter-log-events \
  --log-group-name /aws/connect/ContactFlowLogs \
  --filter-pattern "{ $.ContactId = \"specific-contact-id\" }"
```

### Common Error Patterns
```javascript
// Lambda timeout handling
export const handler = async (event) => {
  const timeout = setTimeout(() => {
    throw new Error('Function timeout');
  }, 2500); // 500ms before actual timeout
  
  try {
    const result = await processRequest(event);
    clearTimeout(timeout);
    return result;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
};

// DynamoDB error handling
const queryWithRetry = async (params, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await ddbDocClient.send(new QueryCommand(params));
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100));
    }
  }
};
```

---

## 📋 Environment Setup

### Local Development
```bash
# Install dependencies
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb

# Set environment variables
export AWS_REGION=us-east-1
export TABLE_NAME=Customers
export LOG_LEVEL=DEBUG

# Local testing with SAM
sam local start-api
sam local invoke MyFirstLambda -e events/test-event.json
```

### Test Events
```json
// events/test-event.json
{
  "Details": {
    "ContactData": {
      "CustomerEndpoint": {
        "Address": "+919395196855"
      }
    }
  }
}
```

---

## 📝 Configuration Files

### package.json
```json
{
  "name": "contact-center-lambda",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.450.0",
    "@aws-sdk/lib-dynamodb": "^3.450.0"
  },
  "scripts": {
    "test": "jest",
    "build": "npm run test && zip -r function.zip .",
    "deploy": "aws lambda update-function-code --function-name MyFirstLambda --zip-file fileb://function.zip"
  }
}
```

### template.yaml (SAM)
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Parameters:
  Environment:
    Type: String
    Default: dev
  TableName:
    Type: String
    Default: Customers

Resources:
  MyFirstLambda:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/
      Handler: index.handler
      Runtime: nodejs22.x
      Timeout: 3
      Environment:
        Variables:
          TABLE_NAME: !Ref TableName
          ENVIRONMENT: !Ref Environment
      Policies:
        - DynamoDBReadPolicy:
            TableName: !Ref TableName
```

---

## 🧪 Testing Snippets

### Unit Tests
```javascript
// tests/handler.test.js
import { handler } from '../index.mjs';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const ddbMock = mockClient(DynamoDBDocumentClient);

test('returns personalized greeting', async () => {
  ddbMock.on(QueryCommand).resolves({
    Items: [{ CustomerId: 'HK4463', firstName: 'John' }]
  });

  const event = {
    Details: {
      ContactData: {
        CustomerEndpoint: { Address: '+1234567890' }
      }
    }
  };

  const result = await handler(event);
  expect(result.statusCode).toBe(200);
  expect(result.body).toContain('Hello John');
});
```

### Integration Tests
```bash
# Test complete flow
curl -X POST https://api.amazon.com/contact-centers/test \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919395196855"}'

# Load test with Artillery
artillery quick --count 10 --num 100 \
  https://your-api-endpoint.com/test
```

---

## 📞 Common Phone Number Formats

### E.164 Format Validation
```javascript
const validatePhone = (phone) => {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
};

const normalizePhone = (phone) => {
  // Remove all non-digits except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Ensure it starts with +
  if (!cleaned.startsWith('+')) {
    return '+1' + cleaned; // Assume US if no country code
  }
  
  return cleaned;
};
```

### Sample Phone Numbers for Testing
```javascript
const testNumbers = {
  us: '+12345678901',
  uk: '+447700123456', 
  india: '+919395196855',
  canada: '+15551234567'
};
```

---

## 🔐 Security Best Practices

### IAM Role (Least Privilege)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:Query",
        "dynamodb:GetItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:*:table/Customers*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-east-1:*:*"
    }
  ]
}
```

### Input Validation
```javascript
const validateInput = (event) => {
  if (!event?.Details?.ContactData?.CustomerEndpoint?.Address) {
    throw new Error('Invalid input: missing customer phone number');
  }
  
  const phone = event.Details.ContactData.CustomerEndpoint.Address;
  if (!validatePhone(phone)) {
    throw new Error('Invalid phone number format');
  }
  
  return phone;
};
```

---

*Quick reference for rapid development and troubleshooting. Keep this handy during development and deployment activities.*