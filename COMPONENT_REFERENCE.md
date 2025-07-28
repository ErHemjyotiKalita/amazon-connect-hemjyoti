# 🔧 Component Reference Guide

## Overview
This document provides detailed implementation references for each component in the Hemjyoti IT Consulting Contact Center system. Use this alongside the main API documentation for complete technical specifications.

---

## Lambda Function Components

### MyFirstLambda Implementation Details

#### Dependencies
```json
{
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.x.x",
    "@aws-sdk/lib-dynamodb": "^3.x.x"
  },
  "devDependencies": {
    "@types/node": "^20.x.x"
  }
}
```

#### Environment Configuration
```javascript
// Runtime: nodejs22.x
// Memory: 128 MB
// Timeout: 3 seconds
// Architecture: x86_64
```

#### Error Handling Patterns
```javascript
// Comprehensive error handling implementation
export const handler = async (event) => {
    const correlationId = event.requestId || generateUUID();
    
    try {
        // Input validation
        if (!event?.Details?.ContactData?.CustomerEndpoint?.Address) {
            console.warn(`[${correlationId}] Missing customer phone number`);
            return createResponse(200, getDefaultGreeting());
        }

        const customerPhone = sanitizePhoneNumber(
            event.Details.ContactData.CustomerEndpoint.Address
        );

        // Database operation with retry logic
        const customer = await getCustomerWithRetry(customerPhone, 3);
        
        if (customer) {
            console.info(`[${correlationId}] Customer found: ${customer.CustomerId}`);
            return createResponse(200, getPersonalizedGreeting(customer.firstName));
        } else {
            console.info(`[${correlationId}] Customer not found for phone: ${customerPhone}`);
            return createResponse(200, getDefaultGreeting());
        }
        
    } catch (error) {
        console.error(`[${correlationId}] Lambda execution error:`, {
            error: error.message,
            stack: error.stack,
            event: JSON.stringify(event)
        });
        
        return createResponse(500, 'Internal Server Error');
    }
};

// Helper functions
function createResponse(statusCode, body) {
    return { statusCode, body };
}

function getDefaultGreeting() {
    return 'Thank you for calling Hemjyoti IT consulting services';
}

function getPersonalizedGreeting(firstName) {
    return `Hello ${firstName}, Thank you for calling Hemjyoti IT consulting services`;
}

function sanitizePhoneNumber(phone) {
    return phone.replace(/[^\d+]/g, '');
}

async function getCustomerWithRetry(phone, maxRetries) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await queryCustomerByPhone(phone);
        } catch (error) {
            if (attempt === maxRetries) throw error;
            await sleep(Math.pow(2, attempt) * 100); // Exponential backoff
        }
    }
}
```

#### Performance Optimization
```javascript
// Connection pooling for DynamoDB
const ddbConfig = {
    maxAttempts: 3,
    retryDelayOptions: {
        customBackoff: function(retryCount) {
            return Math.pow(2, retryCount) * 100;
        }
    }
};

const client = new DynamoDBClient(ddbConfig);
const ddbDocClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
        removeUndefinedValues: true,
        convertEmptyValues: false,
    }
});
```

---

## Contact Flow Components

### Flow Action Types Reference

#### Set Contact Attributes
```json
{
  "Type": "SetAttributes",
  "Parameters": {
    "Attributes": {
      "customerPhone": "$.CustomerEndpoint.Address",
      "timestamp": "$.SystemEndpoint.Address"
    }
  },
  "Transitions": {
    "NextAction": "next-action-id"
  }
}
```

#### Invoke AWS Lambda Function
```json
{
  "Type": "InvokeLambdaFunction",
  "Parameters": {
    "LambdaFunctionARN": "arn:aws:lambda:us-east-1:account:function:MyFirstLambda",
    "InvocationTimeLimitSeconds": "3",
    "LambdaInvocationAttributes": {
      "customerPhone": "$.CustomerEndpoint.Address"
    }
  },
  "Transitions": {
    "NextAction": "play-prompt-action",
    "Errors": [
      {
        "ErrorType": "NoMatchingError",
        "NextAction": "error-handler-action"
      }
    ]
  }
}
```

#### Get Customer Input
```json
{
  "Type": "GetUserInput",
  "Parameters": {
    "Text": "Please enter your account number followed by the hash key",
    "MaxDigits": 10,
    "Timeout": "5",
    "TerminatorDigits": "#",
    "Attributes": {
      "accountNumber": "$.StoredCustomerInput"
    }
  },
  "Transitions": {
    "NextAction": "validate-input",
    "Errors": [
      {
        "ErrorType": "Timeout",
        "NextAction": "timeout-handler"
      },
      {
        "ErrorType": "NoMatchingCondition", 
        "NextAction": "invalid-input-handler"
      }
    ]
  }
}
```

#### Transfer to Queue
```json
{
  "Type": "TransferContactToQueue",
  "Parameters": {
    "QueueId": "arn:aws:connect:us-east-1:account:queue/queue-id"
  },
  "Transitions": {
    "NextAction": "end-flow",
    "Errors": [
      {
        "ErrorType": "QueueAtCapacity",
        "NextAction": "queue-full-handler"
      }
    ]
  }
}
```

### Flow Variable Reference

#### System Variables
- `$.SystemEndpoint.Address`: Connect instance phone number
- `$.CustomerEndpoint.Address`: Customer's phone number
- `$.Queue.Name`: Current queue name
- `$.Queue.ARN`: Current queue ARN
- `$.Agent.ARN`: Assigned agent ARN
- `$.ContactId`: Unique contact identifier

#### Custom Attributes
- `$.Attributes.customerPhone`: Stored customer phone
- `$.Attributes.customerName`: Retrieved customer name
- `$.Attributes.queuePriority`: Routing priority
- `$.Attributes.callReason`: Categorized call purpose

---

## Amazon Lex Bot Components

### Intent Configuration Structure

#### Intent Definition Template
```json
{
  "name": "IntentName",
  "identifier": "UNIQUE_ID",
  "description": "Intent description",
  "sampleUtterances": [
    {"utterance": "sample phrase 1"},
    {"utterance": "sample phrase 2"}
  ],
  "intentConfirmationSetting": {
    "isActive": true,
    "promptSpecification": {
      "messageGroupsList": [
        {
          "message": {
            "plainTextMessage": {
              "value": "Confirmation message"
            }
          }
        }
      ],
      "maxRetries": 3,
      "allowInterrupt": true
    }
  },
  "slotPriorities": [
    {"priority": 1, "slotName": "SlotName1"},
    {"priority": 2, "slotName": "SlotName2"}
  ]
}
```

#### Slot Type Definitions
```json
{
  "slotTypeName": "PhoneNumberType",
  "slotTypeValues": [
    {
      "sampleValue": {
        "value": "+1234567890"
      },
      "synonyms": [
        {"value": "phone"},
        {"value": "number"},
        {"value": "telephone"}
      ]
    }
  ],
  "valueSelectionStrategy": "ORIGINAL_VALUE",
  "parentSlotTypeSignature": "AMAZON.PhoneNumber"
}
```

### Lex Response Templates

#### Standard Slot Elicitation
```json
{
  "messages": [
    {
      "contentType": "PlainText",
      "content": "What is your {SlotName}?"
    }
  ],
  "maxRetries": 3,
  "allowInterrupt": true,
  "messageSelectionStrategy": "Random"
}
```

#### Intent Fulfillment Response
```json
{
  "sessionState": {
    "intent": {
      "name": "payment",
      "state": "Fulfilled"
    },
    "sessionAttributes": {
      "customerName": "John Doe",
      "accountNumber": "12345"
    }
  },
  "messages": [
    {
      "contentType": "PlainText",
      "content": "Thank you {customerName}, your payment request has been processed."
    }
  ]
}
```

---

## DynamoDB Components

### Table Design Patterns

#### Customer Table Structure
```json
{
  "TableName": "Customers",
  "BillingMode": "PAY_PER_REQUEST",
  "AttributeDefinitions": [
    {
      "AttributeName": "CustomerId",
      "AttributeType": "S"
    },
    {
      "AttributeName": "phoneNumber", 
      "AttributeType": "S"
    },
    {
      "AttributeName": "email",
      "AttributeType": "S"
    }
  ],
  "KeySchema": [
    {
      "AttributeName": "CustomerId",
      "KeyType": "HASH"
    }
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "phoneNumber-index",
      "KeySchema": [
        {
          "AttributeName": "phoneNumber",
          "KeyType": "HASH"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    },
    {
      "IndexName": "email-index",
      "KeySchema": [
        {
          "AttributeName": "email",
          "KeyType": "HASH"
        }
      ],
      "Projection": {
        "ProjectionType": "INCLUDE",
        "NonKeyAttributes": ["firstName", "lastName", "planName"]
      }
    }
  ]
}
```

#### Query Optimization Examples
```javascript
// Efficient phone number lookup
const queryByPhone = {
    TableName: 'Customers',
    IndexName: 'phoneNumber-index',
    KeyConditionExpression: 'phoneNumber = :phone',
    ExpressionAttributeValues: {
        ':phone': '+919395196855'
    },
    ProjectionExpression: 'CustomerId, firstName, lastName, planName'
};

// Batch get multiple customers
const batchGet = {
    RequestItems: {
        'Customers': {
            Keys: [
                {'CustomerId': 'HK4463'},
                {'CustomerId': 'HK4464'}
            ],
            ProjectionExpression: 'CustomerId, firstName, email'
        }
    }
};

// Conditional updates
const updateCustomer = {
    TableName: 'Customers',
    Key: {'CustomerId': 'HK4463'},
    UpdateExpression: 'SET planName = :plan, updatedAt = :timestamp',
    ConditionExpression: 'attribute_exists(CustomerId)',
    ExpressionAttributeValues: {
        ':plan': 'premium',
        ':timestamp': new Date().toISOString()
    },
    ReturnValues: 'ALL_NEW'
};
```

### Data Access Patterns

#### Read Patterns
1. **Customer by Phone**: `phoneNumber-index` GSI
2. **Customer by Email**: `email-index` GSI  
3. **Customer by ID**: Primary key lookup
4. **Bulk Customer Retrieval**: BatchGetItem operation

#### Write Patterns
1. **New Customer Registration**: PutItem with condition
2. **Customer Profile Update**: UpdateItem with conditions
3. **Plan Upgrade**: Conditional update based on current plan
4. **Bulk Customer Import**: BatchWriteItem operation

---

## CloudWatch Monitoring Components

### Custom Metrics Implementation

#### Lambda Function Metrics
```javascript
import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";

const cloudwatch = new CloudWatchClient({});

async function publishCustomMetric(metricName, value, unit = 'Count') {
    const params = {
        Namespace: 'Hemjyoti/ContactCenter',
        MetricData: [
            {
                MetricName: metricName,
                Value: value,
                Unit: unit,
                Timestamp: new Date(),
                Dimensions: [
                    {
                        Name: 'Environment',
                        Value: process.env.ENVIRONMENT || 'prod'
                    },
                    {
                        Name: 'Function',
                        Value: 'MyFirstLambda'
                    }
                ]
            }
        ]
    };
    
    try {
        await cloudwatch.send(new PutMetricDataCommand(params));
    } catch (error) {
        console.error('Failed to publish metric:', error);
    }
}

// Usage examples
await publishCustomMetric('CustomerLookupSuccess', 1);
await publishCustomMetric('CustomerLookupLatency', 150, 'Milliseconds');
await publishCustomMetric('DatabaseErrors', 1);
```

#### CloudWatch Dashboard Configuration
```json
{
  "widgets": [
    {
      "type": "metric",
      "x": 0,
      "y": 0,
      "width": 12,
      "height": 6,
      "properties": {
        "metrics": [
          ["AWS/Lambda", "Duration", "FunctionName", "MyFirstLambda"],
          [".", "Invocations", ".", "."],
          [".", "Errors", ".", "."],
          [".", "Throttles", ".", "."]
        ],
        "view": "timeSeries",
        "stacked": false,
        "region": "us-east-1",
        "title": "Lambda Performance",
        "period": 300,
        "stat": "Average"
      }
    },
    {
      "type": "metric",
      "x": 0,
      "y": 6,
      "width": 12,
      "height": 6,
      "properties": {
        "metrics": [
          ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", "Customers"],
          [".", "ConsumedWriteCapacityUnits", ".", "."],
          [".", "ThrottledRequests", ".", "."]
        ],
        "view": "timeSeries",
        "stacked": false,
        "region": "us-east-1",
        "title": "DynamoDB Performance",
        "period": 300
      }
    }
  ]
}
```

### Alarm Configurations

#### Critical Alarms
```json
{
  "LambdaErrorRate": {
    "AlarmName": "MyFirstLambda-HighErrorRate",
    "AlarmDescription": "Lambda function error rate exceeds threshold",
    "MetricName": "Errors",
    "Namespace": "AWS/Lambda",
    "Statistic": "Sum",
    "Period": 300,
    "EvaluationPeriods": 2,
    "Threshold": 5,
    "ComparisonOperator": "GreaterThanThreshold",
    "AlarmActions": [
      "arn:aws:sns:us-east-1:account:alerts-topic"
    ]
  },
  "LambdaDurationAlarm": {
    "AlarmName": "MyFirstLambda-HighDuration", 
    "AlarmDescription": "Lambda function duration exceeds threshold",
    "MetricName": "Duration",
    "Namespace": "AWS/Lambda",
    "Statistic": "Average",
    "Period": 300,
    "EvaluationPeriods": 3,
    "Threshold": 2000,
    "ComparisonOperator": "GreaterThanThreshold"
  }
}
```

---

## Integration Patterns

### Amazon Connect to Lambda
```javascript
// Connect event structure for Lambda invocation
const connectEvent = {
  "Details": {
    "ContactData": {
      "Attributes": {
        "customAttribute": "value"
      },
      "Channel": "VOICE",
      "ContactId": "contact-id",
      "CustomerEndpoint": {
        "Address": "+1234567890",
        "Type": "TELEPHONE_NUMBER"
      },
      "InitialContactId": "initial-contact-id",
      "InitiationMethod": "INBOUND",
      "InstanceARN": "arn:aws:connect:region:account:instance/instance-id",
      "MediaStreams": {},
      "PreviousContactId": "previous-contact-id", 
      "Queue": {
        "ARN": "arn:aws:connect:region:account:queue/queue-id",
        "Name": "BasicQueue"
      },
      "SystemEndpoint": {
        "Address": "+1234567891",
        "Type": "TELEPHONE_NUMBER"
      }
    },
    "Parameters": {
      "customParameter": "parameterValue"
    }
  },
  "Name": "ContactFlowEvent"
};
```

### Lambda to DynamoDB
```javascript
// Optimized DynamoDB operations
class CustomerService {
    constructor() {
        this.ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
    }
    
    async getCustomerByPhone(phoneNumber) {
        const params = {
            TableName: 'Customers',
            IndexName: 'phoneNumber-index',
            KeyConditionExpression: 'phoneNumber = :phone',
            ExpressionAttributeValues: {
                ':phone': phoneNumber
            },
            Limit: 1
        };
        
        const result = await this.ddbClient.send(new QueryCommand(params));
        return result.Items?.[0] || null;
    }
    
    async batchGetCustomers(customerIds) {
        const params = {
            RequestItems: {
                'Customers': {
                    Keys: customerIds.map(id => ({CustomerId: id}))
                }
            }
        };
        
        const result = await this.ddbClient.send(new BatchGetCommand(params));
        return result.Responses?.Customers || [];
    }
}
```

### Connect to Lex Integration
```json
{
  "Type": "GetUserInput",
  "Parameters": {
    "LexBot": {
      "BotName": "HemjyotiITconsultingSupport",
      "BotAlias": "$LATEST",
      "LocaleId": "en_US"
    },
    "Text": "How can I help you today?",
    "SessionAttributes": {
      "customerPhone": "$.CustomerEndpoint.Address",
      "contactId": "$.ContactId"
    }
  },
  "Transitions": {
    "NextAction": "process-lex-response",
    "Errors": [
      {
        "ErrorType": "NoMatchingCondition",
        "NextAction": "fallback-handler"
      }
    ]
  }
}
```

---

## Testing Components

### Unit Test Examples

#### Lambda Function Tests
```javascript
import { handler } from '../index.mjs';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('MyFirstLambda', () => {
    beforeEach(() => {
        ddbMock.reset();
    });
    
    test('should return personalized greeting for known customer', async () => {
        // Mock DynamoDB response
        ddbMock.on(QueryCommand).resolves({
            Items: [{
                CustomerId: 'HK4463',
                firstName: 'hemjyoti',
                phoneNumber: '+919395196855'
            }]
        });
        
        const event = {
            Details: {
                ContactData: {
                    CustomerEndpoint: {
                        Address: '+919395196855'
                    }
                }
            }
        };
        
        const result = await handler(event);
        
        expect(result.statusCode).toBe(200);
        expect(result.body).toBe('Hello hemjyoti, Thank you for calling Hemjyoti IT consulting services');
    });
    
    test('should return default greeting for unknown customer', async () => {
        ddbMock.on(QueryCommand).resolves({ Items: [] });
        
        const event = {
            Details: {
                ContactData: {
                    CustomerEndpoint: {
                        Address: '+1111111111'
                    }
                }
            }
        };
        
        const result = await handler(event);
        
        expect(result.statusCode).toBe(200);
        expect(result.body).toBe('Thank you for calling Hemjyoti IT consulting services');
    });
});
```

### Integration Test Patterns
```javascript
// End-to-end test for Contact Flow
describe('Contact Flow Integration', () => {
    test('should process inbound call with customer lookup', async () => {
        // 1. Simulate Connect event
        const connectEvent = createConnectEvent('+919395196855');
        
        // 2. Test Lambda invocation
        const lambdaResult = await invokeLambda('MyFirstLambda', connectEvent);
        expect(lambdaResult.statusCode).toBe(200);
        
        // 3. Verify DynamoDB query
        const customer = await getCustomerByPhone('+919395196855');
        expect(customer).toBeDefined();
        
        // 4. Test flow continuation
        expect(lambdaResult.body).toContain('Hello hemjyoti');
    });
});
```

---

*This component reference provides detailed implementation specifications for all system components. Use it alongside the main API documentation for complete development and integration guidance.*