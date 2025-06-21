# 💼 Amazon Connect Contact Center – Hemjyoti IT Consulting

This project is a full-featured **cloud-based contact center** built using Amazon Connect for Hemjyoti IT Consulting. It includes **voice, chat, and task routing**, integrated with **Lex bots, Lambda functions**, **DynamoDB for working hours**, and **CloudWatch for monitoring**.

---

## 🛠️ Features Implemented

- 🎧 **Custom Contact Flows** for inbound voice, chat, whisper, disconnect, and task scenarios
- 🤖 **Lex Bot Integration** for intelligent voice/chat interaction
- 🧠 **Lambda Function** for dynamic queue routing based on business hours
- 📊 **CloudWatch Logs** for real-time monitoring and issue tracing
- 🗃️ **DynamoDB** to maintain working hours and control routing dynamically
- 🚀 **Fully Automated Setup** using AWS native services

---

## 📁 Project Contents

- `contact-flows/`: Amazon Connect contact flow JSON exports
- `lambda/`: Lambda function ZIP package
- `dynamodb/`: CSV of dynamic working hour rules
- `lex-bot/`: Lex bot export configuration
- `cloudwatch-logs/`: Raw CloudWatch logs
- `assets/`: Screenshots of the dashboard, flows, and integrations

---

## 🖼️ Sample Screenshots

| Amazon Connect Dashboard | Inbound Call Flow | Lambda Function |
|--------------------------|-------------------|------------------|
| ![](assets/Connect_dashboard.JPG) | ![](assets/Inbound_callFlow.JPG) | ![](assets/Lambda.JPG) |

---

## 🚀 How It Works

1. **User initiates a voice/chat/task request**
2. Amazon Connect runs the relevant **Contact Flow**
3. A **Lambda Function** checks **DynamoDB** for current working hours
4. Based on the result, routing happens to the appropriate queue or Lex bot
5. **CloudWatch** captures logs for every interaction

---

## 📌 Tech Stack

- Amazon Connect
- AWS Lambda (Node.js)
- Amazon Lex
- Amazon DynamoDB
- Amazon CloudWatch

---

## 🙋‍♂️ Author

**Hemjyoti IT Consulting Contact Center Project**  
Built for self-practice and demonstration of AWS Contact Center capabilities.  
Feel free to fork or contribute!
