# 🚀 Deployment Guide

## Overview
Complete step-by-step guide for deploying the Hemjyoti IT Consulting Contact Center system from scratch.

---

## 📋 Prerequisites

### AWS Account Setup
- AWS Account with administrative access
- AWS CLI installed and configured
- Node.js 22.x or later installed
- SAM CLI installed (optional but recommended)

### Required Services Access
- Amazon Connect
- AWS Lambda  
- Amazon DynamoDB
- Amazon Lex
- Amazon CloudWatch
- AWS IAM

### Local Development Tools
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Install SAM CLI
pip install aws-sam-cli

# Install Node.js dependencies
npm install -g @aws-cdk/cli
```

---

## 🏗️ Infrastructure Setup

### Step 1: Create IAM Roles

#### Lambda Execution Role
```bash
aws iam create-role \
  --role-name HemjyotiContactCenter-LambdaExecutionRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {"Service": "lambda.amazonaws.com"},
        "Action": "sts:AssumeRole"
      }
    ]
  }'

# Attach policies
aws iam attach-role-policy \
  --role-name HemjyotiContactCenter-LambdaExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Create custom DynamoDB policy
aws iam create-policy \
  --policy-name HemjyotiContactCenter-DynamoDBPolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "dynamodb:Query",
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem"
        ],
        "Resource": "arn:aws:dynamodb:*:*:table/Customers*"
      }
    ]
  }'

# Attach custom policy
aws iam attach-role-policy \
  --role-name HemjyotiContactCenter-LambdaExecutionRole \
  --policy-arn arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/HemjyotiContactCenter-DynamoDBPolicy
```

#### Connect Service Role
```bash
aws iam create-role \
  --role-name HemjyotiContactCenter-ConnectRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {"Service": "connect.amazonaws.com"},
        "Action": "sts:AssumeRole"
      }
    ]
  }'

aws iam attach-role-policy \
  --role-name HemjyotiContactCenter-ConnectRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonConnect_FullAccess
```

### Step 2: Create DynamoDB Table

#### Create Table with GSI
```bash
aws dynamodb create-table \
  --table-name Customers \
  --attribute-definitions \
    AttributeName=CustomerId,AttributeType=S \
    AttributeName=phoneNumber,AttributeType=S \
    AttributeName=email,AttributeType=S \
  --key-schema AttributeName=CustomerId,KeyType=HASH \
  --global-secondary-indexes \
    IndexName=phoneNumber-index,KeySchema=[{AttributeName=phoneNumber,KeyType=HASH}],Projection={ProjectionType=ALL} \
    IndexName=email-index,KeySchema=[{AttributeName=email,KeyType=HASH}],Projection={ProjectionType=INCLUDE,NonKeyAttributes=[firstName,lastName,planName]} \
  --billing-mode PAY_PER_REQUEST \
  --tags Key=Project,Value=HemjyotiContactCenter Key=Environment,Value=Production
```

#### Wait for table creation
```bash
aws dynamodb wait table-exists --table-name Customers
echo "Table created successfully"
```

#### Load sample data
```bash
# Create sample-data.json
cat > sample-data.json << 'EOF'
{
  "Customers": [
    {
      "PutRequest": {
        "Item": {
          "CustomerId": {"S": "HK4463"},
          "phoneNumber": {"S": "+919395196855"},
          "firstName": {"S": "hemjyoti"},
          "lastName": {"S": "kalita"},
          "email": {"S": "evanhem@gmail.com"},
          "city": {"S": "nalbari"},
          "planName": {"S": "ultra"}
        }
      }
    }
  ]
}
EOF

# Load data
aws dynamodb batch-write-item --request-items file://sample-data.json
```

---

## 🔧 Lambda Function Deployment

### Step 3: Deploy Lambda Function

#### Method A: Using SAM (Recommended)

Create `template.yaml`:
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Parameters:
  Environment:
    Type: String
    Default: prod
    AllowedValues: [dev, staging, prod]

Globals:
  Function:
    Timeout: 3
    Runtime: nodejs22.x
    Environment:
      Variables:
        TABLE_NAME: Customers
        ENVIRONMENT: !Ref Environment

Resources:
  MyFirstLambda:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/
      Handler: index.handler
      Description: Customer lookup function for contact center
      Policies:
        - Statement:
          - Effect: Allow
            Action:
              - dynamodb:Query
              - dynamodb:GetItem
            Resource: !Sub 'arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/Customers*'
      Events:
        ConnectTrigger:
          Type: Api
          Properties:
            Path: /test
            Method: post

  # CloudWatch Log Group
  LambdaLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: !Sub '/aws/lambda/${MyFirstLambda}'
      RetentionInDays: 14

Outputs:
  MyFirstLambdaArn:
    Description: ARN of the Lambda function
    Value: !GetAtt MyFirstLambda.Arn
    Export:
      Name: !Sub '${AWS::StackName}-LambdaArn'

  TestEndpoint:
    Description: API Gateway endpoint URL for testing
    Value: !Sub 'https://${ServerlessRestApi}.execute-api.${AWS::Region}.amazonaws.com/Prod/test'
```

Create `src/index.mjs`:
```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
    const correlationId = event.requestId || Math.random().toString(36).substring(7);
    
    try {
        console.log(`[${correlationId}] Event received:`, JSON.stringify(event));
        
        // Extract customer phone from different event sources
        let customerPhone;
        if (event?.Details?.ContactData?.CustomerEndpoint?.Address) {
            // Amazon Connect event
            customerPhone = event.Details.ContactData.CustomerEndpoint.Address;
        } else if (event?.body) {
            // API Gateway event
            const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
            customerPhone = body.phoneNumber;
        } else {
            console.warn(`[${correlationId}] No customer phone number found in event`);
            return createResponse(200, getDefaultGreeting());
        }

        console.log(`[${correlationId}] Looking up customer: ${customerPhone}`);

        const params = {
            TableName: process.env.TABLE_NAME || 'Customers',
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
        
        let greeting;
        if (result.Items && result.Items.length > 0) {
            const customer = result.Items[0];
            greeting = `Hello ${customer.firstName}, Thank you for calling Hemjyoti IT consulting services`;
            console.log(`[${correlationId}] Customer found: ${customer.CustomerId}`);
        } else {
            greeting = getDefaultGreeting();
            console.log(`[${correlationId}] Customer not found`);
        }

        return createResponse(200, greeting);

    } catch (error) {
        console.error(`[${correlationId}] Error:`, error);
        return createResponse(500, 'Internal Server Error');
    }
};

function createResponse(statusCode, body) {
    return {
        statusCode,
        body: typeof body === 'string' ? body : JSON.stringify(body),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    };
}

function getDefaultGreeting() {
    return 'Thank you for calling Hemjyoti IT consulting services';
}
```

Deploy with SAM:
```bash
# Build
sam build

# Deploy
sam deploy --guided \
  --stack-name hemjyoti-contact-center \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides Environment=prod

# Test the deployment
aws lambda invoke \
  --function-name $(aws cloudformation describe-stacks \
    --stack-name hemjyoti-contact-center \
    --query 'Stacks[0].Outputs[?OutputKey==`MyFirstLambdaArn`].OutputValue' \
    --output text | cut -d':' -f7) \
  --payload '{"Details":{"ContactData":{"CustomerEndpoint":{"Address":"+919395196855"}}}}' \
  response.json

cat response.json
```

#### Method B: Direct Deployment
```bash
# Create deployment package
mkdir lambda-package
cp index.mjs lambda-package/
cd lambda-package
npm init -y
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
zip -r ../function.zip .
cd ..

# Deploy function
aws lambda create-function \
  --function-name MyFirstLambda \
  --runtime nodejs22.x \
  --role arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/HemjyotiContactCenter-LambdaExecutionRole \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 3 \
  --memory-size 128 \
  --environment Variables='{TABLE_NAME=Customers}' \
  --description "Customer lookup function for Hemjyoti IT contact center"
```

---

## 🤖 Amazon Lex Bot Setup

### Step 4: Create and Configure Lex Bot

#### Create Bot
```bash
# Create bot
aws lexv2-models create-bot \
  --bot-name HemjyotiITconsultingSupport \
  --description "Support bot for Hemjyoti IT consulting" \
  --role-arn arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/aws-service-role/lexv2.amazonaws.com/AWSServiceRoleForLexV2Bots \
  --data-privacy '{"ChildDirected": false}' \
  --idle-session-ttl-in-seconds 300

# Wait for bot creation
BOT_ID=$(aws lexv2-models list-bots --query 'botSummaries[?botName==`HemjyotiITconsultingSupport`].botId' --output text)
echo "Bot ID: $BOT_ID"
```

#### Create Bot Locale
```bash
aws lexv2-models create-bot-locale \
  --bot-id $BOT_ID \
  --bot-version DRAFT \
  --locale-id en_US \
  --description "English locale for support bot" \
  --nlu-intent-confidence-threshold 0.40
```

#### Create Intents
```bash
# Payment Intent
aws lexv2-models create-intent \
  --bot-id $BOT_ID \
  --bot-version DRAFT \
  --locale-id en_US \
  --intent-name payment \
  --description "Handle payment requests" \
  --sample-utterances file://payment-utterances.json \
  --slot-priorities file://payment-slots.json
```

Create `payment-utterances.json`:
```json
[
  {"utterance": "I want to make a payment"},
  {"utterance": "I would like to make payment"},
  {"utterance": "Help me pay my bill"},
  {"utterance": "Payment assistance"},
  {"utterance": "I need to pay"}
]
```

Create `payment-slots.json`:
```json
[
  {"priority": 1, "slotName": "FirstName"},
  {"priority": 2, "slotName": "PhoneNumber"}
]
```

---

## 📞 Amazon Connect Setup

### Step 5: Create Connect Instance

#### Create Instance
```bash
# Create Connect instance
aws connect create-instance \
  --identity-management-type CONNECT_MANAGED \
  --instance-alias hemjyoti-it-consulting \
  --inbound-calls-enabled \
  --outbound-calls-enabled

# Get instance details
INSTANCE_ID=$(aws connect list-instances --query 'InstanceSummaryList[0].Id' --output text)
echo "Connect Instance ID: $INSTANCE_ID"
```

#### Configure Lambda Integration
```bash
# Allow Connect to invoke Lambda
aws lambda add-permission \
  --function-name MyFirstLambda \
  --statement-id connect-invoke \
  --action lambda:InvokeFunction \
  --principal connect.amazonaws.com \
  --source-arn arn:aws:connect:$(aws configure get region):$(aws sts get-caller-identity --query Account --output text):instance/$INSTANCE_ID
```

### Step 6: Import Contact Flows

#### Create Contact Flow from JSON
```bash
# Import inbound call flow
aws connect create-contact-flow \
  --instance-id $INSTANCE_ID \
  --name "Hemjyoti IT Inbound Call Flow" \
  --type CONTACT_FLOW \
  --description "Main inbound call flow with customer lookup" \
  --content file://inbound-call-flow.json

# Import other flows
for flow in "chat-flow" "queue-flow" "whisper-flow" "disconnect-flow" "task-flow"; do
  aws connect create-contact-flow \
    --instance-id $INSTANCE_ID \
    --name "Hemjyoti IT $flow" \
    --type CONTACT_FLOW \
    --content file://$flow.json
done
```

#### Update Flow with Lambda ARN
```bash
# Get Lambda ARN
LAMBDA_ARN=$(aws lambda get-function --function-name MyFirstLambda --query 'Configuration.FunctionArn' --output text)

# Update contact flow configuration
sed -i "s/LAMBDA_ARN_PLACEHOLDER/$LAMBDA_ARN/g" inbound-call-flow.json
```

---

## 📊 CloudWatch Monitoring Setup

### Step 7: Configure Monitoring

#### Create CloudWatch Dashboard
```bash
cat > dashboard-config.json << 'EOF'
{
  "widgets": [
    {
      "type": "metric",
      "x": 0, "y": 0, "width": 12, "height": 6,
      "properties": {
        "metrics": [
          ["AWS/Lambda", "Duration", "FunctionName", "MyFirstLambda"],
          [".", "Invocations", ".", "."],
          [".", "Errors", ".", "."]
        ],
        "view": "timeSeries",
        "stacked": false,
        "region": "us-east-1",
        "title": "Lambda Performance"
      }
    },
    {
      "type": "metric", 
      "x": 0, "y": 6, "width": 12, "height": 6,
      "properties": {
        "metrics": [
          ["AWS/Connect", "ContactsReceived", "InstanceId", "INSTANCE_ID_PLACEHOLDER"],
          [".", "ContactsHandled", ".", "."],
          [".", "MissedCalls", ".", "."]
        ],
        "view": "timeSeries",
        "stacked": false,
        "region": "us-east-1",
        "title": "Connect Metrics"
      }
    }
  ]
}
EOF

# Replace placeholder and create dashboard
sed -i "s/INSTANCE_ID_PLACEHOLDER/$INSTANCE_ID/g" dashboard-config.json

aws cloudwatch put-dashboard \
  --dashboard-name "Hemjyoti-ContactCenter-Dashboard" \
  --dashboard-body file://dashboard-config.json
```

#### Create Alarms
```bash
# Lambda error alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "HemjyotiContactCenter-Lambda-Errors" \
  --alarm-description "Lambda function error rate" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 3 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=MyFirstLambda \
  --evaluation-periods 2

# Lambda duration alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "HemjyotiContactCenter-Lambda-Duration" \
  --alarm-description "Lambda function high duration" \
  --metric-name Duration \
  --namespace AWS/Lambda \
  --statistic Average \
  --period 300 \
  --threshold 2000 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=MyFirstLambda \
  --evaluation-periods 3

# DynamoDB throttling alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "HemjyotiContactCenter-DynamoDB-Throttles" \
  --alarm-description "DynamoDB throttling events" \
  --metric-name ThrottledRequests \
  --namespace AWS/DynamoDB \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --dimensions Name=TableName,Value=Customers \
  --evaluation-periods 1
```

---

## ✅ Testing and Validation

### Step 8: End-to-End Testing

#### Test Lambda Function
```bash
# Test with sample event
aws lambda invoke \
  --function-name MyFirstLambda \
  --payload '{
    "Details": {
      "ContactData": {
        "CustomerEndpoint": {
          "Address": "+919395196855"
        }
      }
    }
  }' \
  test-response.json

echo "Lambda Response:"
cat test-response.json
```

#### Test DynamoDB Access
```bash
# Query customer directly
aws dynamodb query \
  --table-name Customers \
  --index-name phoneNumber-index \
  --key-condition-expression "phoneNumber = :phone" \
  --expression-attribute-values '{":phone":{"S":"+919395196855"}}'
```

#### Test Contact Flow (if Connect instance is configured)
```bash
# This would typically be done through the Connect console
# or by making an actual phone call to test the flow
echo "Contact flow testing should be done through:"
echo "1. Amazon Connect console - Test contact flow feature"
echo "2. Actual phone call to the Connect instance number"
echo "3. Connect simulator (if available)"
```

### Step 9: Performance Testing

#### Load Test Lambda
```bash
# Create load test script
cat > load-test.js << 'EOF'
const AWS = require('aws-sdk');
const lambda = new AWS.Lambda();

async function testLoad(concurrency = 10, iterations = 100) {
    const promises = [];
    
    for (let i = 0; i < concurrency; i++) {
        promises.push(runIterations(iterations / concurrency));
    }
    
    const start = Date.now();
    await Promise.all(promises);
    const duration = Date.now() - start;
    
    console.log(`Completed ${iterations} requests in ${duration}ms`);
    console.log(`Average: ${duration/iterations}ms per request`);
}

async function runIterations(count) {
    for (let i = 0; i < count; i++) {
        await lambda.invoke({
            FunctionName: 'MyFirstLambda',
            Payload: JSON.stringify({
                Details: {
                    ContactData: {
                        CustomerEndpoint: {
                            Address: '+919395196855'
                        }
                    }
                }
            })
        }).promise();
    }
}

testLoad().catch(console.error);
EOF

# Run load test
node load-test.js
```

---

## 🔄 Post-Deployment Configuration

### Step 10: Environment-Specific Configuration

#### Production Settings
```bash
# Update Lambda configuration for production
aws lambda update-function-configuration \
  --function-name MyFirstLambda \
  --memory-size 256 \
  --timeout 5 \
  --environment Variables='{
    TABLE_NAME=Customers,
    LOG_LEVEL=INFO,
    ENVIRONMENT=production
  }'

# Enable X-Ray tracing
aws lambda update-function-configuration \
  --function-name MyFirstLambda \
  --tracing-config Mode=Active
```

#### Configure Backup
```bash
# Enable point-in-time recovery for DynamoDB
aws dynamodb update-continuous-backups \
  --table-name Customers \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true

# Create backup schedule
aws backup create-backup-plan \
  --backup-plan file://backup-plan.json
```

Create `backup-plan.json`:
```json
{
  "BackupPlanName": "HemjyotiContactCenter-BackupPlan",
  "Rules": [
    {
      "RuleName": "DailyBackups",
      "TargetBackupVault": "default",
      "ScheduleExpression": "cron(0 2 * * ? *)",
      "Lifecycle": {
        "DeleteAfterDays": 30
      }
    }
  ]
}
```

---

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] AWS CLI configured
- [ ] IAM roles created
- [ ] Prerequisites installed
- [ ] Code reviewed and tested

### Infrastructure
- [ ] DynamoDB table created and configured
- [ ] Lambda function deployed
- [ ] Lex bot configured
- [ ] Connect instance created
- [ ] Contact flows imported

### Configuration  
- [ ] Lambda permissions configured
- [ ] Environment variables set
- [ ] Monitoring alarms created
- [ ] Dashboard configured
- [ ] Backup enabled

### Testing
- [ ] Lambda function tested
- [ ] DynamoDB queries verified
- [ ] Contact flows tested
- [ ] End-to-end flow validated
- [ ] Performance testing completed

### Post-Deployment
- [ ] Documentation updated
- [ ] Team training completed
- [ ] Support procedures established
- [ ] Monitoring alerts configured

---

## 🚨 Troubleshooting Common Issues

### Deployment Failures

#### Lambda Permission Issues
```bash
# Check Lambda execution role
aws iam get-role --role-name HemjyotiContactCenter-LambdaExecutionRole

# Verify attached policies
aws iam list-attached-role-policies --role-name HemjyotiContactCenter-LambdaExecutionRole
```

#### DynamoDB Access Issues
```bash
# Test DynamoDB access
aws dynamodb describe-table --table-name Customers

# Check table status
aws dynamodb wait table-exists --table-name Customers
```

#### Connect Integration Issues
```bash
# Verify Lambda permissions for Connect
aws lambda get-policy --function-name MyFirstLambda

# Check Connect instance status
aws connect describe-instance --instance-id $INSTANCE_ID
```

### Runtime Issues

#### Lambda Timeout
```bash
# Increase timeout
aws lambda update-function-configuration \
  --function-name MyFirstLambda \
  --timeout 10
```

#### Memory Issues
```bash
# Increase memory
aws lambda update-function-configuration \
  --function-name MyFirstLambda \
  --memory-size 512
```

---

## 📞 Support and Maintenance

### Regular Maintenance Tasks
1. Monitor CloudWatch metrics and alarms
2. Review Lambda function logs weekly
3. Update dependencies monthly
4. Test backup and restore procedures quarterly
5. Review and update documentation

### Emergency Procedures
1. **Lambda Function Down**: Deploy previous version, check logs
2. **DynamoDB Issues**: Check throttling, enable auto-scaling
3. **Connect Outage**: Check service health, failover procedures
4. **High Error Rates**: Review recent deployments, rollback if needed

---

*This deployment guide provides complete instructions for setting up the Hemjyoti IT Consulting Contact Center system. Follow each step carefully and refer to troubleshooting sections if issues arise.*