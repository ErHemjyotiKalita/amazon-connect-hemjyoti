# 📚 Amazon Connect Contact Center - Complete API Documentation

## Table of Contents
- [System Overview](#system-overview)
- [AWS Lambda Functions](#aws-lambda-functions)
- [Amazon Lex Bot API](#amazon-lex-bot-api)
- [Contact Flow Configuration](#contact-flow-configuration)
- [DynamoDB Schema](#dynamodb-schema)
- [CloudWatch Integration](#cloudwatch-integration)
- [Setup and Deployment](#setup-and-deployment)
- [Usage Examples](#usage-examples)
- [Troubleshooting](#troubleshooting)

---

## System Overview

The Hemjyoti IT Consulting Contact Center is a cloud-based solution built on AWS that provides:
- **Voice calling** through Amazon Connect
- **Chat support** with intelligent routing
- **Task management** and workflow automation
- **Customer recognition** via phone number lookup
- **Dynamic routing** based on business hours
- **Real-time monitoring** and logging

### Architecture Components
- **Amazon Connect**: Contact center platform
- **AWS Lambda**: Serverless compute for business logic
- **Amazon Lex**: Conversational AI chatbot
- **DynamoDB**: Customer data storage
- **CloudWatch**: Monitoring and logging

---

## AWS Lambda Functions

### MyFirstLambda Function

#### Purpose
Handles customer phone number lookup and provides personalized greetings for incoming calls.

#### Function Signature
```javascript
export const handler = async (event) => Promise<Object>
```

#### Input Parameters
The Lambda function receives an Amazon Connect event object with the following structure:

```json
{
  "Details": {
    "ContactData": {
      "CustomerEndpoint": {
        "Address": "+1234567890"
      }
    }
  }
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `event.Details.ContactData.CustomerEndpoint.Address` | string | Customer's phone number in E.164 format |

#### Output Response
```json
{
  "statusCode": 200,
  "body": "Hello {firstName}, Thank you for calling Hemjyoti IT consulting services"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `statusCode` | number | HTTP status code (200 for success, 500 for error) |
| `body` | string | Personalized greeting message |

#### DynamoDB Integration
The function queries the `Customers` table using:
- **Table Name**: `Customers`
- **Index**: `phoneNumber-index`
- **Query**: Exact match on phone number

#### Error Handling
- Returns generic greeting if customer not found
- Logs errors to CloudWatch
- Returns 500 status code for internal errors

#### Usage Example
```javascript
// Example event from Amazon Connect
const event = {
  Details: {
    ContactData: {
      CustomerEndpoint: {
        Address: "+919395196855"
      }
    }
  }
};

// Function will return personalized greeting for known customer
// Result: "Hello hemjyoti, Thank you for calling Hemjyoti IT consulting services"
```

#### IAM Permissions Required
```yaml
- dynamodb:Query
- dynamodb:GetItem
- logs:CreateLogGroup
- logs:CreateLogStream
- logs:PutLogEvents
```

---

## Amazon Lex Bot API

### Bot Configuration

#### Bot Details
- **Name**: HemjyotiITconsultingSupport
- **Version**: 1
- **Locale**: en_US
- **Session Timeout**: 300 seconds (5 minutes)

### Intents

#### 1. Payment Intent

##### Purpose
Handles customer payment requests and collects necessary information before transferring to sales agent.

##### Sample Utterances
```
"i want to make a payment"
"i would like to make payment"
```

##### Slots
1. **FirstName** (Required)
   - Type: Custom slot type
   - Priority: 1
   - Used to personalize the interaction

2. **PhoneNumber** (Required)
   - Type: Custom slot type  
   - Priority: 2
   - Used for customer verification

##### Dialog Flow
1. **Initial Response**: Prompts for FirstName slot
2. **Slot Elicitation**: Collects required information
3. **Confirmation**: "Thank you for providing the details, In order to make a payment I will have to transfer you to a sales agent, May I proceed"
4. **Fulfillment**: "Thank you, please wait while I connect you to a sales agent"

##### Configuration Parameters
```json
{
  "maxRetries": 4,
  "allowInterrupt": true,
  "messageSelectionStrategy": "Random",
  "sessionTimeout": 300,
  "dtmfConfiguration": {
    "maxLength": 513,
    "deletionCharacter": "*",
    "endCharacter": "#",
    "endTimeoutMs": 5000
  }
}
```

#### 2. WebsiteDown Intent

##### Purpose
Handles customer inquiries about website availability issues.

##### Usage
Customers can report website problems and receive appropriate support routing.

#### 3. FallbackIntent

##### Purpose
Catches unrecognized user inputs and provides fallback responses.

##### Behavior
- Activated when no other intent matches
- Provides helpful redirection options
- Maintains conversation flow

### API Integration

#### Lex Runtime API
```javascript
// Example: Posting text to Lex bot
const params = {
  botId: 'DVBRZJU0PZ',
  localeId: 'en_US',
  sessionId: 'unique-session-id',
  text: 'I want to make a payment'
};
```

#### Response Format
```json
{
  "sessionId": "unique-session-id",
  "interpretations": [
    {
      "intent": {
        "name": "payment",
        "slots": {
          "FirstName": {"value": "John"},
          "PhoneNumber": {"value": "+1234567890"}
        }
      }
    }
  ]
}
```

---

## Contact Flow Configuration

### Available Contact Flows

#### 1. Inbound Call Flow
- **File**: `Hemjyoti IT consulting inbound call flow.json`
- **Purpose**: Main entry point for voice calls
- **Features**: Customer recognition, business hours routing, Lex integration

#### 2. Inbound Chat Flow  
- **File**: `Hemjyoti IT Consulting inbound chat flow.json`
- **Purpose**: Handles chat conversations
- **Features**: Chatbot integration, escalation to human agents

#### 3. Customer Queue Flow
- **File**: `Hemjyoti IT consulting customer queue flow.json`  
- **Purpose**: Manages customer waiting experience
- **Features**: Hold music, queue position announcements

#### 4. Customer Whisper Flow
- **File**: `Hemjyoti IT consulting customer whisper flow.json`
- **Purpose**: Provides agent with customer context
- **Features**: Customer information whisper to agent

#### 5. Chat Disconnect Flow
- **File**: `Hemjyoti IT consulting chat disconnect flow.json`
- **Purpose**: Handles chat session termination
- **Features**: Cleanup and session management

#### 6. Task Flow
- **File**: `Hemjyoti IT consulting Task flow.json`
- **Purpose**: Manages task routing and assignment
- **Features**: Automated task distribution

### Flow Trigger Events

#### Inbound Call Flow Triggers
```json
{
  "triggerType": "InboundCall",
  "conditions": [
    {
      "condition": "PhoneNumber",
      "value": "+1234567890"
    }
  ]
}
```

#### Chat Flow Triggers  
```json
{
  "triggerType": "ChatMessage",
  "conditions": [
    {
      "condition": "Channel",
      "value": "Chat"
    }
  ]
}
```

### Configuration Parameters

#### Standard Flow Parameters
```json
{
  "version": "2019-10-30",
  "startAction": "action-id",
  "metadata": {
    "entryPointPosition": {"x": -128, "y": -87.2},
    "actionMetadata": {}
  }
}
```

---

## DynamoDB Schema

### Customers Table

#### Table Structure
```json
{
  "TableName": "Customers",
  "KeySchema": [
    {
      "AttributeName": "CustomerId",
      "KeyType": "HASH"
    }
  ],
  "AttributeDefinitions": [
    {
      "AttributeName": "CustomerId", 
      "AttributeType": "S"
    },
    {
      "AttributeName": "phoneNumber",
      "AttributeType": "S"
    }
  ]
}
```

#### Global Secondary Index
```json
{
  "IndexName": "phoneNumber-index",
  "KeySchema": [
    {
      "AttributeName": "phoneNumber",
      "KeyType": "HASH"
    }
  ]
}
```

#### Record Schema
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `CustomerId` | String | Unique customer identifier | "HK4463" |
| `phoneNumber` | String | Customer phone number (E.164) | "+919395196855" |
| `firstName` | String | Customer first name | "hemjyoti" |
| `lastName` | String | Customer last name | "kalita" |
| `email` | String | Customer email address | "evanhem@gmail.com" |
| `city` | String | Customer city | "nalbari" |
| `planName` | String | Customer service plan | "ultra" |

#### Sample Record
```json
{
  "CustomerId": "HK4463",
  "phoneNumber": "+919395196855", 
  "firstName": "hemjyoti",
  "lastName": "kalita",
  "email": "evanhem@gmail.com",
  "city": "nalbari",
  "planName": "ultra"
}
```

#### Query Patterns

##### Find Customer by Phone Number
```javascript
const params = {
  TableName: 'Customers',
  IndexName: 'phoneNumber-index',
  KeyConditionExpression: '#phone = :phoneValue',
  ExpressionAttributeNames: {
    '#phone': 'phoneNumber'
  },
  ExpressionAttributeValues: {
    ':phoneValue': '+919395196855'
  }
};
```

##### Get Customer by ID
```javascript
const params = {
  TableName: 'Customers',
  Key: {
    'CustomerId': 'HK4463'
  }
};
```

---

## CloudWatch Integration

### Log Groups

#### Lambda Function Logs
- **Log Group**: `/aws/lambda/MyFirstLambda`
- **Retention**: 14 days (configurable)
- **Log Level**: INFO, ERROR

#### Connect Instance Logs
- **Log Group**: `/aws/connect/ContactFlowLogs`
- **Log Group**: `/aws/connect/ContactTrace`

### Metrics

#### Lambda Metrics
- `Duration`: Function execution time
- `Invocations`: Number of function calls
- `Errors`: Function error count
- `Throttles`: Function throttling events

#### Connect Metrics
- `ContactsReceived`: Total incoming contacts
- `ContactsHandled`: Successfully processed contacts
- `AverageQueueTime`: Wait time in queue
- `ServiceLevel`: Service level percentage

### Alarms Configuration

#### Lambda Error Alarm
```json
{
  "AlarmName": "MyFirstLambda-Errors",
  "MetricName": "Errors", 
  "Namespace": "AWS/Lambda",
  "Statistic": "Sum",
  "Period": 300,
  "EvaluationPeriods": 1,
  "Threshold": 1,
  "ComparisonOperator": "GreaterThanOrEqualToThreshold"
}
```

### Log Analysis

#### Sample Log Events
```json
{
  "timestamp": "2025-06-21T16:48:00.000Z",
  "level": "INFO",
  "requestId": "abc-123-def",
  "message": "Event: {\"Details\":{\"ContactData\":{\"CustomerEndpoint\":{\"Address\":\"+919395196855\"}}}}"
}
```

---

## Setup and Deployment

### Prerequisites
- AWS Account with appropriate permissions
- Amazon Connect instance
- DynamoDB table with customer data
- IAM roles and policies configured

### Deployment Steps

#### 1. Deploy Lambda Function
```bash
# Using AWS SAM
sam build
sam deploy --guided

# Using AWS CLI
aws lambda create-function \
  --function-name MyFirstLambda \
  --runtime nodejs22.x \
  --role arn:aws:iam::account:role/lambda-role \
  --handler index.handler \
  --zip-file fileb://function.zip
```

#### 2. Create DynamoDB Table
```bash
aws dynamodb create-table \
  --table-name Customers \
  --attribute-definitions \
    AttributeName=CustomerId,AttributeType=S \
    AttributeName=phoneNumber,AttributeType=S \
  --key-schema AttributeName=CustomerId,KeyType=HASH \
  --global-secondary-indexes file://gsi.json \
  --billing-mode PAY_PER_REQUEST
```

#### 3. Import Contact Flows
```bash
# Using AWS CLI
aws connect create-contact-flow \
  --instance-id your-instance-id \
  --name "Inbound Call Flow" \
  --type CONTACT_FLOW \
  --content file://inbound-call-flow.json
```

#### 4. Deploy Lex Bot
```bash
# Create bot from exported configuration
aws lexv2-models create-bot-locale \
  --bot-id DVBRZJU0PZ \
  --locale-id en_US \
  --bot-locale-specification file://bot-locale.json
```

### Environment Variables

#### Lambda Function
```bash
export TABLE_NAME=Customers
export AWS_REGION=us-east-1
export LOG_LEVEL=INFO
```

### IAM Permissions

#### Lambda Execution Role
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
      "Resource": "arn:aws:dynamodb:*:*:table/Customers*"
    },
    {
      "Effect": "Allow", 
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream", 
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

---

## Usage Examples

### End-to-End Call Flow

#### 1. Customer Calls
```
Customer dials: +1-800-HEMJYOTI
```

#### 2. Connect Processes Call
```json
{
  "contactId": "abc-123-def",
  "customerNumber": "+919395196855",
  "timestamp": "2025-01-20T10:00:00Z"
}
```

#### 3. Lambda Lookup
```javascript
// Lambda receives event
const event = {
  Details: {
    ContactData: {
      CustomerEndpoint: {
        Address: "+919395196855"
      }
    }
  }
};

// DynamoDB query executes
const result = await ddbDocClient.send(new QueryCommand(params));

// Returns personalized greeting
return {
  statusCode: 200,
  body: "Hello hemjyoti, Thank you for calling Hemjyoti IT consulting services"
};
```

#### 4. Contact Flow Uses Response
```
System plays: "Hello hemjyoti, Thank you for calling Hemjyoti IT consulting services"
```

### Chat Bot Interaction

#### 1. Customer Initiates Chat
```
Customer: "I want to make a payment"
```

#### 2. Lex Processes Intent
```json
{
  "intent": "payment",
  "confidence": 0.95,
  "slots": {}
}
```

#### 3. Bot Collects Information
```
Bot: "I'll help you with payment. What's your first name?"
Customer: "John"
Bot: "Thank you John. What's your phone number?"
Customer: "+1234567890"
Bot: "Thank you for providing the details, In order to make a payment I will have to transfer you to a sales agent, May I proceed?"
```

### Task Routing Example

#### 1. Task Creation
```json
{
  "taskType": "PaymentIssue",
  "customerPhone": "+919395196855",
  "priority": "High",
  "description": "Customer payment failed"
}
```

#### 2. Routing Logic
```javascript
// Route based on customer plan and issue type
if (customer.planName === "ultra" && task.priority === "High") {
  return "PremiumSupportQueue";
} else {
  return "GeneralSupportQueue";
}
```

---

## Troubleshooting

### Common Issues

#### 1. Lambda Function Errors

**Error**: "Unable to import module 'index'"
```bash
# Solution: Check file structure
ls -la
# Ensure index.mjs exists and has correct exports
```

**Error**: "User is not authorized to perform: dynamodb:Query"
```json
// Solution: Add DynamoDB permissions to Lambda role
{
  "Effect": "Allow",
  "Action": ["dynamodb:Query"],
  "Resource": "arn:aws:dynamodb:*:*:table/Customers*"
}
```

#### 2. Contact Flow Issues

**Error**: "Flow execution failed"
```bash
# Check CloudWatch logs
aws logs filter-log-events \
  --log-group-name /aws/connect/ContactFlowLogs \
  --start-time 1642665600000
```

**Solution**: Verify Lambda function ARN in contact flow configuration

#### 3. Lex Bot Issues

**Error**: "Intent not recognized"
```json
// Solution: Add more training utterances
{
  "sampleUtterances": [
    {"utterance": "i want to make a payment"},
    {"utterance": "i would like to make payment"},
    {"utterance": "help me pay my bill"},
    {"utterance": "payment assistance"}
  ]
}
```

#### 4. DynamoDB Issues

**Error**: "ResourceNotFoundException"
```bash
# Solution: Verify table exists
aws dynamodb describe-table --table-name Customers
```

**Error**: "ProvisionedThroughputExceededException"
```bash
# Solution: Check if on-demand billing is enabled
aws dynamodb modify-table \
  --table-name Customers \
  --billing-mode PAY_PER_REQUEST
```

### Monitoring and Alerts

#### Set up CloudWatch Dashboards
```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/Lambda", "Duration", "FunctionName", "MyFirstLambda"],
          ["AWS/Lambda", "Invocations", "FunctionName", "MyFirstLambda"],
          ["AWS/Lambda", "Errors", "FunctionName", "MyFirstLambda"]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1"
      }
    }
  ]
}
```

#### Debug Mode
Enable detailed logging in Lambda:
```javascript
console.log('Event:', JSON.stringify(event, null, 2));
console.log('Customer phone:', customerPhone);
console.log('DynamoDB result:', JSON.stringify(result, null, 2));
```

### Performance Optimization

#### Lambda Optimization
- Use connection pooling for DynamoDB
- Implement proper error handling
- Set appropriate memory allocation
- Enable X-Ray tracing for debugging

#### DynamoDB Optimization
- Use efficient query patterns
- Implement proper indexing strategy
- Monitor read/write capacity
- Use batch operations when possible

---

## API Reference Summary

### Lambda Functions
- `MyFirstLambda`: Customer lookup and greeting service

### Lex Intents
- `payment`: Handle payment requests
- `WebsiteDown`: Handle website issues  
- `FallbackIntent`: Catch-all for unrecognized inputs

### Contact Flows
- Inbound Call Flow: Main voice entry point
- Inbound Chat Flow: Chat conversation handler
- Customer Queue Flow: Queue management
- Customer Whisper Flow: Agent context
- Chat Disconnect Flow: Session cleanup
- Task Flow: Task routing

### DynamoDB Tables
- `Customers`: Customer information storage

### CloudWatch Resources
- Lambda function logs and metrics
- Connect instance logs and metrics
- Custom dashboards and alarms

---

*This documentation covers all public APIs, functions, and components of the Hemjyoti IT Consulting Amazon Connect Contact Center system. For additional support or questions, please refer to the AWS documentation or contact the development team.*