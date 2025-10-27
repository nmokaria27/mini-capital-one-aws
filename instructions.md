Sweet — I’ll draft a clean, copy-pasteable `INSTRUCTION.md` you can drop into your repo. I’ll bake in everything we set up already, what’s left, and exactly how to finish it with minimal cost and maximal clarity.

---

# INSTRUCTION.md

> Mini Capital One (AWS) — End-to-End Setup, Deploy, and Test Guide
> **Stack:** Amplify (hosting) · API Gateway (HTTP API) · Lambda (Node 18) · DynamoDB (users) · RDS MySQL Free Tier (transactions)
> **Region:** `us-east-1`
> **Stage:** `$default`
> **Frontend URL (Amplify):** `https://main.d39rly73pvywwe.amplifyapp.com`
> **API Base URL:** `https://y85zq1ex6c.execute-api.us-east-1.amazonaws.com`
> **DynamoDB Table:** `CapitalOne-Users`
> **IAM Role (Lambdas):** `CapitalOneLambdaRole`

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Repo Layout (recommended)](#repo-layout-recommended)
3. [Cost Control](#cost-control)
4. [Environment & Secrets](#environment--secrets)
5. [Teammate A — Frontend & Users (DONE + polish)](#teammate-a--frontend--users-done--polish)

   * A1 DynamoDB (Done)
   * A2 Lambda `createUser` (Done)
   * A3 API Gateway `/users` (Done)
   * A4 Hosting (Amplify) (Done)
   * A5 Frontend wiring & test (Do this)
6. [Teammate B — Transactions & Ledger (TO DO)](#teammate-b--transactions--ledger-to-do)

   * B1 RDS MySQL Free Tier
   * B2 Secrets Manager
   * B3 Lambda `transactionService`
   * B4 API Gateway `/transactions`
   * B5 Test & verify
7. [CORS & Security](#cors--security)
8. [Testing Playbook](#testing-playbook)
9. [Troubleshooting Matrix](#troubleshooting-matrix)
10. [Automation (Amplify or S3 via GitHub Actions)](#automation-amplify-or-s3-via-github-actions)
11. [Cleanup](#cleanup)
12. [Appendix](#appendix)

* A. `createUser` Lambda (Node 18)
* B. `transactionService` Lambda (Node 18)
* C. SQL schema for `transactions`
* D. `amplify.yml` examples

---

## Project Overview

A minimal “Capital One-like” web app:

* **Frontend** (static): account creation, deposit/withdraw UI.
* **Users (current state)** → **DynamoDB**
* **Transactions (append-only)** → **MySQL (RDS Free Tier)**
* **Lambdas**:

  * `createUser` → create user record in DynamoDB
  * `transactionService` → atomic DynamoDB update + insert into RDS `transactions`
* **API Gateway (HTTP API)**:

  * `POST /users` → `createUser`
  * `POST /transactions` → `transactionService`

> We intentionally use the **RDS Free Tier (db.t3.micro)** instead of **Aurora Serverless** to keep costs near $0.

---

## Repo Layout (recommended)

```
mini-capital-one-aws/
├─ frontend/
│  ├─ index.html
│  └─ app.js
├─ lambdas/
│  ├─ createUser/
│  │  └─ index.mjs
│  └─ transactionService/
│     └─ index.mjs         # will be added in B3
├─ database/
│  └─ mysql-transactions.sql  # schema (see Appendix C)
├─ iam/
│  ├─ lambda-execution-role.json  # (optional documentation)
│  └─ lambda-policy.json          # (optional documentation)
├─ amplify.yml                  # build config for Amplify (see Appendix D)
└─ INSTRUCTION.md               # this file
```

> If your `index.html` lives in a different folder, update `amplify.yml`’s `baseDirectory` accordingly.

---

## Cost Control

* **One region everywhere:** `us-east-1`.
* **Budgets:** Billing → Budgets → monthly **$1** alert.
* **Use free tier:**

  * API Gateway (HTTP API), Lambda, DynamoDB (on-demand), Amplify (light usage)
  * **RDS MySQL Free Tier** (`db.t3.micro`) — **stop** when not testing.
* Avoid Aurora Serverless for this midterm (not free tier).

---

## Environment & Secrets

| Component            | Value                                                                   |
| -------------------- | ----------------------------------------------------------------------- |
| Region               | `us-east-1`                                                             |
| Stage                | `$default`                                                              |
| API Base URL         | `https://y85zq1ex6c.execute-api.us-east-1.amazonaws.com`                |
| Amplify URL          | `https://main.d39rly73pvywwe.amplifyapp.com`                            |
| DynamoDB Table       | `CapitalOne-Users`                                                      |
| IAM Role for Lambdas | `CapitalOneLambdaRole` (DynamoDB + CloudWatch; add RDS + Secrets later) |

**Lambda env vars:**

* For `createUser`: `DYNAMODB_TABLE_NAME=CapitalOne-Users`
* For `transactionService` (after B2):

  * `DYNAMODB_TABLE_NAME=CapitalOne-Users`
  * `DB_SECRET_ARN=<your secret arn>`
  * `DB_HOST=<your rds endpoint>`
  * `DB_NAME=capitalone_banking`

---

## Teammate A — Frontend & Users (DONE + polish)

### A1 — DynamoDB (Done)

* Table: `CapitalOne-Users`
* PK: `userId` (String)
* On-demand mode

### A2 — Lambda `createUser` (Done)

* Runtime: Node.js 18
* Role: `CapitalOneLambdaRole`
* Env: `DYNAMODB_TABLE_NAME`
* Code: [Appendix A](#a-createuser-lambda-node-18)

### A3 — API Gateway `/users` (Done)

* HTTP API
* Route: `POST /users` → integration: `createUser`
* Stage: `$default`
* Invoke URL: `https://y85zq1ex6c.execute-api.us-east-1.amazonaws.com`
* CORS: allow Amplify origin

### A4 — Hosting (Amplify) (Done)

* Connected to GitHub repo
* Add `amplify.yml` with correct `baseDirectory` (see Appendix D)
* Deployment URL: `https://main.d39rly73pvywwe.amplifyapp.com`

### A5 — Frontend wiring & test (Do this)

* In `frontend/app.js` set:

  ```js
  const API_BASE = "https://y85zq1ex6c.execute-api.us-east-1.amazonaws.com";
  ```
* Ensure the registration form sends exactly:

  ```json
  {
    "fullName": "...",
    "dob": "YYYY-MM-DD",
    "email": "...",
    "initialBalance": 250
  }
  ```
* Test from browser (Network tab) + verify in DynamoDB.

---

## Teammate B — Transactions & Ledger (TO DO)

### B1 — RDS MySQL Free Tier

1. **RDS → Create database**

   * Engine: **MySQL**
   * Template: **Free tier**
   * Class: `db.t3.micro`
   * Public access: **No**
   * Region: `us-east-1`
2. Wait for **Available**; note **Endpoint** (host) and **Port**.
3. Create DB & table (Appendix C). You can use **Query Editor v2**:

   * Create database: `capitalone_banking`
   * Create table: `transactions`

### B2 — Secrets Manager

1. Secrets Manager → **Store new secret**

   * Type: Credentials for RDS database
   * Choose the RDS instance; save as
     `capitalone/rds/mysql` (or any clear name)
2. Note the **Secret ARN**.

### B3 — Lambda `transactionService`

1. Use role `CapitalOneLambdaRole`, **add**:

   * **VPC config**: same VPC/subnets/security group as RDS
   * Policy that allows **SecretsManager GetSecretValue**
   * (Optional) narrow RDS permissions if you use IAM auth; simplest is username/password from secret
2. **Env vars**:

   * `DYNAMODB_TABLE_NAME=CapitalOne-Users`
   * `DB_SECRET_ARN=<your secret arn>`
   * `DB_HOST=<your rds endpoint>`
   * `DB_NAME=capitalone_banking`
3. Code (Node 18) in [Appendix B](#b-transactionservice-lambda-node-18)

   * Uses `mysql2/promise` (bundle in your zip)
   * **Flow:** read balance → compute new → conditional `UpdateItem` → insert transaction → return new balance

> **Packaging note:** Because Lambda needs `mysql2`, zip the folder with `node_modules`.
> Example:
>
> ```
> cd lambdas/transactionService
> npm init -y
> npm i mysql2 @aws-sdk/client-dynamodb @aws-sdk/client-secrets-manager uuid
> zip -r transactionService.zip .
> # Upload zip in Lambda console
> ```

### B4 — API Gateway `/transactions`

* HTTP API → **Add route**: `POST /transactions` → integration: `transactionService`
* CORS: allow Amplify origin; methods: `POST, OPTIONS`

### B5 — Test & verify

* cURL:

  ```bash
  curl -i -X POST "https://y85zq1ex6c.execute-api.us-east-1.amazonaws.com/transactions" \
    -H "Content-Type: application/json" \
    -d '{"userId":"<uuid>", "type":"DEPOSIT", "amount": 40.5}'
  ```
* Expect `200` + `{ "balance": <newBalance>, "transactionId": "<uuid>" }`
* **DynamoDB**: updated balance
* **RDS**: row inserted in `transactions`

---

## CORS & Security

* **API Gateway CORS**

  * Allowed origins: `https://main.d39rly73pvywwe.amplifyapp.com`
  * Allowed methods: `POST, OPTIONS` (add `GET` later if you implement reads)
  * Allowed headers: `Content-Type, Accept, X-Requested-With`
* **Lambda invoke permission**

  * Lambda → `Configuration → Permissions` must include a resource policy allowing `apigateway.amazonaws.com` to invoke.
* **IAM**

  * `CapitalOneLambdaRole` needs:

    * DynamoDB: `GetItem`, `PutItem`, `UpdateItem` on `CapitalOne-Users`
    * Logs: CloudWatch
    * Secrets Manager: `GetSecretValue` (for `transactionService`)
  * If using VPC: Lambda’s SG must **egress** to DB SG:3306; DB SG must **ingress** from Lambda SG:3306.

---

## Testing Playbook

1. **API Gateway Console Test**

   * `/users` with body:

     ```json
     { "fullName":"Test", "dob":"2000-01-01", "email":"t@e.com", "initialBalance": 123 }
     ```
   * Expect 200; verify DynamoDB item.
2. **Frontend Test (Amplify)**

   * Open `https://main.d39rly73pvywwe.amplifyapp.com`
   * Create account → watch **Network** tab → verify `POST /users` is 200.
3. **Transaction Test (after B4)**

   * `POST /transactions` from website with `DEPOSIT` or `WITHDRAW`
   * Verify updated balance in DynamoDB + row in RDS.
4. **CloudWatch Logs**

   * `createUser`: `/aws/lambda/createUser`
   * `transactionService`: `/aws/lambda/transactionService`
5. **API Access Logs** (optional but recommended)

   * API Gateway → enable Access Logs to `/apigw/capitalone-banking-api`

---

## Troubleshooting Matrix

| Symptom                             | Likely Cause                   | Fix                                                                           |
| ----------------------------------- | ------------------------------ | ----------------------------------------------------------------------------- |
| Browser says “Failed to parse URL…” | `API_BASE` still a placeholder | Set `API_BASE = https://y85zq1ex6c.execute-api.us-east-1.amazonaws.com`       |
| 404 Not Found                       | Wrong path or stage            | Use `/users` with `$default` (no `/prod`)                                     |
| CORS preflight failed               | CORS origin/headers missing    | Add Amplify URL origin; allow `POST, OPTIONS`; headers `Content-Type, Accept` |
| 403 from Lambda                     | Missing invoke permission      | Add resource policy allowing API Gateway on Lambda                            |
| 400 `Missing fields`                | Payload key mismatch           | Use `fullName`, `dob`, `email`, `initialBalance`                              |
| 500 Server error                    | Env var/table name wrong       | `DYNAMODB_TABLE_NAME=CapitalOne-Users`; check CW logs                         |
| No item in DynamoDB after 200       | Wrong region/table             | Use `us-east-1`; table name exact                                             |
| `transactionService` times out      | VPC networking to RDS missing  | Put Lambda in same VPC/subnets; SG rules (Lambda → DB:3306)                   |
| `ER_ACCESS_DENIED_ERROR`            | Bad DB creds/secret            | Check Secrets Manager content & ARN                                           |

---

## Automation (Amplify or S3 via GitHub Actions)

### Amplify (you’re using this)

* Put `amplify.yml` at repo root (see Appendix D).
* Set the `baseDirectory` to where `index.html` lives (e.g., `frontend`).
* Every `git push` triggers a new deploy.

### S3 + GitHub Actions (alternative)

* Add repo secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`.
* Workflow:

```yaml
name: Deploy to S3
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: jakejarvis/s3-sync-action@master
        with:
          args: --acl public-read --follow-symlinks --delete
        env:
          AWS_S3_BUCKET: capitalone-banking-app-<your-initials>
          AWS_REGION: us-east-1
          SOURCE_DIR: frontend
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

---

## Cleanup

When done or idle (to ensure $0–$1/month):

* **Stop** RDS instance.
* Keep DynamoDB (on-demand) and Lambdas; negligible.
* Keep Amplify (light usage); or disconnect app if not needed.
* Budget alerts stay on.

---

## Appendix

### A. `createUser` Lambda (Node 18)

```javascript
// index.mjs
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from "uuid";
const ddb = new DynamoDBClient({});

export const handler = async (event) => {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const { fullName, dob, email, initialBalance } = body || {};
    if (!fullName || !dob || !email || initialBalance == null) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing fields" }) };
    }
    const userId = uuidv4();
    const now = new Date().toISOString();
    await ddb.send(new PutItemCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: {
        userId: { S: userId }, fullName: { S: fullName }, dob: { S: dob }, email: { S: email },
        balance: { N: Number(initialBalance).toFixed(2) }, createdAt: { S: now }, updatedAt: { S: now }
      },
      ConditionExpression: "attribute_not_exists(userId)"
    }));
    return { statusCode: 200, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, balance: Number(initialBalance) }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: "Server error" }) };
  }
};
```

---

### B. `transactionService` Lambda (Node 18)

> **Remember:** zip with `node_modules` (mysql2). Put Lambda in the **same VPC** as RDS and open SG rules.

```javascript
// index.mjs
import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import mysql from "mysql2/promise";
import { v4 as uuidv4 } from "uuid";

const ddb = new DynamoDBClient({});
const sm  = new SecretsManagerClient({});

async function getConn() {
  const sec = await sm.send(new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_ARN }));
  const { username, password, host, port, dbname } = JSON.parse(sec.SecretString);
  return mysql.createConnection({
    host: host || process.env.DB_HOST,
    port: port || 3306,
    user: username,
    password,
    database: process.env.DB_NAME || dbname,
    ssl: { rejectUnauthorized: true }
  });
}

export const handler = async (event) => {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const { userId, type, amount } = body || {};
    const amt = Number(amount);
    if (!userId || !["DEPOSIT","WITHDRAW"].includes(type) || !(amt > 0)) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid input" }) };
    }

    // 1) Read current balance
    const get = await ddb.send(new GetItemCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: { userId: { S: userId } },
      ProjectionExpression: "balance"
    }));
    if (!get.Item) return { statusCode: 404, body: JSON.stringify({ error: "User not found" }) };

    const current = Number(get.Item.balance.N);
    const change = type === "DEPOSIT" ? amt : -amt;
    const newBal = current + change;
    if (newBal < 0) return { statusCode: 400, body: JSON.stringify({ error: "Insufficient funds" }) };

    // 2) Atomic update
    const now = new Date().toISOString();
    await ddb.send(new UpdateItemCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: { userId: { S: userId } },
      UpdateExpression: "SET balance = :b, updatedAt = :u",
      ConditionExpression: "balance = :old",
      ExpressionAttributeValues: {
        ":b": { N: newBal.toFixed(2) }, ":u": { S: now }, ":old": { N: current.toFixed(2) }
      }
    }));

    // 3) Insert ledger row
    const txnId = uuidv4();
    const conn = await getConn();
    try {
      await conn.execute(
        `INSERT INTO transactions (transaction_id, user_id, transaction_type, amount, balance_after)
         VALUES (?, ?, ?, ?, ?)`,
        [txnId, userId, type, amt, newBal]
      );
    } finally { await conn.end(); }

    return { statusCode: 200, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ balance: newBal, transactionId: txnId }) };
  } catch (err) {
    console.error(err);
    if (String(err.code || err.name).includes("ConditionalCheckFailed")) {
      return { statusCode: 409, body: JSON.stringify({ error: "Balance changed; retry" }) };
    }
    return { statusCode: 500, body: JSON.stringify({ error: "Server error" }) };
  }
};
```

---

### C. SQL schema for `transactions`

```sql
CREATE DATABASE IF NOT EXISTS capitalone_banking;
USE capitalone_banking;

CREATE TABLE IF NOT EXISTS transactions (
  transaction_id   VARCHAR(36) PRIMARY KEY,
  user_id          VARCHAR(64) NOT NULL,
  transaction_type VARCHAR(10) NOT NULL, -- 'DEPOSIT'|'WITHDRAW'
  amount           DECIMAL(12,2) NOT NULL,
  balance_after    DECIMAL(12,2) NOT NULL,
  transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_user_id
  ON transactions (user_id, transaction_date DESC);
```

---

### D. `amplify.yml` examples

**Case 1 — `frontend/` contains `index.html`:**

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - ls -R
    build:
      commands: []
  artifacts:
    baseDirectory: frontend
    files:
      - '**/*'
  cache:
    paths: []
```

**Case 2 — `index.html` at repo root:**

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - ls -R
    build:
      commands: []
  artifacts:
    baseDirectory: .
    files:
      - '**/*'
  cache:
    paths: []
```

---

## That’s it

* Teammate A: you’re effectively done once the browser form creates a user and it shows up in DynamoDB.
* Teammate B: follow Section **B** to finish `/transactions`.
* Ping me if you want a **balance lookup** endpoint next (e.g., `GET /users/{userId}`) and I’ll drop a quick Lambda for that too.