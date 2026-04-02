# NepPay API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
All protected routes require:
```
Authorization: Bearer <token>
```
OTP-gated routes use:
```
Authorization: Bearer <otpToken>
```

---

## File Structure
```
NepPay/
│
├── api/
│   ├── routes/
│   │   ├── auth.js
│   │   ├── user.js
│   │   ├── transactions.js
│   │   ├── payments.js
│   │   ├── contacts.js
│   │   └── stats.js
│   │
│   ├── middleware/
│   │   ├── auth.js          ← Bearer token guard
│   │   ├── otp.js           ← OTP token validation
│   │   └── rateLimit.js     ← daily limit + fee logic
│   │
│   ├── db/
│   │   ├── index.js         ← pg pool
│   │   └── migrations/      ← .sql files
│   │
│   └── utils/
│       ├── fees.js          ← 0.1% fee calc (min ₹10 max ₹1000)
│       ├── qr.js            ← base64 QR generation
│       └── mailer.js        ← OTP delivery (email/SMS)
│
├── public/
│   ├── css/
│   │   ├── tokens.css
│   │   ├── base.css
│   │   ├── components.css
│   │   ├── login.css
│   │   ├── dashboard.css
│   │   ├── statements.css
│   │   ├── send.css
│   │   ├── receive.css
│   │   ├── statistics.css
│   │   └── settings.css
│   │
│   ├── js/
│   │   ├── animations.js
│   │   ├── api.js
│   │   ├── router.js
│   │   ├── login.js
│   │   ├── dashboard.js
│   │   ├── statements.js
│   │   ├── send.js
│   │   ├── receive.js
│   │   ├── statistics.js
│   │   └── settings.js
│   │
│   ├── pages/
│   │   ├── login.html
│   │   ├── forgot.html <- for forgot password/pin resetting
│   │   ├── dashboard.html
│   │   ├── statements.html
│   │   ├── send.html
│   │   ├── receive.html
│   │   ├── statistics.html
│   │   ├── settings.html
│   │   └── pay.html          ← public, no auth
│   │
│   └── assets/
│       ├── icons/
│       └── fonts/
│
└── server.js
```

---

## Error Format
All errors follow this shape:
```json
{
  "error": "string",
  "message": "Human readable message"
}
```

Common HTTP codes:
- `400` — bad request / validation failed
- `401` — unauthorized / invalid token
- `403` — forbidden / OTP required
- `404` — not found
- `429` — rate limited
- `500` — server error


## Routes

---

### 🔐 Auth

#### `POST /api/auth/chekUser?user`
No auth required.

**Return:**
```json
{
  "error": "string",?
  "available": true | false,
}
```


#### `POST /api/auth/register`
No auth required.

**Request:**
```json
{
  "email": "string", // Only email for now, no phone, must contain an @
  "name": "string", // full name, must not be nil and must be > 3 characters
  "username": "string", // must be > 3 characters and not contain any special characters other than an _
  "password": "string", // must be > 8 characters and include a special chatacter, an upper character, a lower character and a number
  "pin": "string" // must be within 4 to 6 digits long
}
```

**Success `201`:**
```json
{
  "message": "Account created",
  "token": "string", // null if the token could not be saved into sessions, the user will have to log in manually
  "user": {
    "id": "string",
    "name": "string",
    "contact": "string",
    "avatar_url": "string | null"
  }
}
```

> Dev mode: user is credited ₹500,000 on register when `DEV_TEST=true`

---

#### `POST /api/auth/login`
No auth required. If an authentication token is passed, that authentication token is made invalid

**Request:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Success `200` — same IP hash:**
```json
{
  "token": "string",
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "avatar_url": "string | null"
  }
}
```

---

#### `POST /api/auth/logout`
**Auth:** `Bearer <token>`

No request body.

**Success `200`:**
> Invalidates the authentication token if provided
```json
{
  "message": "Logged out"
}
```

---

#### `POST /api/auth/reset?password|pin`
**Request:**
```json
{
  "email": "string",
  "oldPassword" | "oldPin": "string",
  "newPassword" | "newPin": "string"
}

**Response:** 
```json 
{
  "message": "Password reset" |  "Pin Reset"
}
```

---

#### `POST /api/auth/forgot`
**Request:**
```json
{
  "email": "string",
  "type": "pin" | "password"
}
```

**Response:** 
```json
{
  "message": "If your email exists, a reset link has been sent."
}
```

---

#### `POST /api/auth/forgot-password`
**Request:**
```json
{
  "token": "string",
  "password": "string"
}
```

**Response:** 
```json
{
  "message": "Password reset successful"
}
```

---

#### `POST /api/auth/forgot-pin`
**Request:**
```json
{
  "token": "string",
  "pin": "string"
}
```

**Response:** 
```json
{
  "message": "Pin reset successful"
}
```

---

### 👤 User

#### `GET /api/user`
**Auth:** `Bearer <token>`

**Success `200`:**
```json
{
  "id": "string",
  "name": "string",
  "contact": "string",
  "avatar_url": "string | null",
  "balance": 500000,
  "created_at": "ISO string"
}
```

---

#### `GET /api/user/balance`
**Auth:** `Bearer <token>`

**Success `200`:**
```json
{
  "balance": 500000
}
```

---

#### `PUT /api/user`
**Auth:** `Bearer <token>`

All fields optional.

**Request:**
```json
{
  "name": "string",
  "avatar_url": "string"
}
```

**Success `200`:**
```json
{
  "message": "Profile updated"
}
```

---

#### `GET /api/user/public/:id|username`
No auth required.

**Success `200`:**
```json
{
  "id": "string",
  "name": "string",
  "avatar_url": "string | null"
}
```

---

### 💸 Transactions

#### `POST /api/transactions/send`
**Auth:** `Bearer <token>`

**Request — initial:**
```json
{
  "receiverId": "string",
  "amount": 25000,
  "pin": "string",
  "note": "string | optional"
  
}
```

**Success `200`:**
```json
{
  "action": "TRANSACTION_SUCCESS",
  "message": "Transaction completed successfully",
  "transactionId": "string",
  "fee": 0
}
```

> Fee is `0` if under daily limit. If daily limit hit (5 txns OR ₹50,000), fee is 0.1% of amount, min ₹10, max ₹1,000.

---

#### `GET /api/transactions`
**Auth:** `Bearer <token>`

**Query params:**
| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | number | 25 | max 100 |
| `offset` | number | 0 | pagination |
| `type` | string | all | `send`, `receive`, `load`, `all` |
| `period` | string | all | `monthly`, `yearly`, `all` |
| `time_range` | number | 1 | number of months/years to include |

**Success `200`:**
```json
{
  "data": [
    {
      "id": "string",
      "type": "send | receive | load",
      "amount": 1000,
      "fee": 0,
      "note": "string | null",
      "status": "success | pending | failed",
      "counterpart": {
        "id": "string",
        "name": "string",
        "avatar_url": "string | null"
      },
      "created_at": "ISO string"
    }
  ],
  "limit": 25,
  "offset": 0,
  "total": 100 // total number of data
}
```

---

#### `GET /api/transactions/:id|username|txid`
**Auth:** `Bearer <token>`

**Success `200`:**
```json
{
  "data": [
    {
      "id": "string",
      "type": "send | receive | load",
      "amount": 1000,
      "fee": 0,
      "note": "string | null",
      "status": "success | pending | failed",
      "counterpart": {
        "id": "string",
        "name": "string",
        "avatar_url": "string | null"
      },
      "balance_after": 499000,
      "created_at": "ISO string"
    }
  ]
}
```

---

### 🧾 Payments

#### `POST /api/payments/receive?amount=num|null`
**Auth:** `Bearer <token>`

No request body. Generates QR and pay link for the logged in user.

**Success `200`:**
```json
{
  "qr": "base64_string",
  "link": "https://neppay.com/pay/:id"
}
```

---

### 👥 Contacts

#### `GET /api/contacts`
**Auth:** `Bearer <token>`

**Success `200`:**
```json
{
  "data": [
    {
      "id": "string",
      "name": "string",
      "avatar_url": "string | null"
    }
  ]
}
```

---

#### `POST /api/contacts/:identifier`
**Auth:** `Bearer <token>`

Looks up a user by email or username or id and adds them.

**Success `201`:**
```json
{
  "message": "Contact added",
  "contact": {
    "id": "string",
    "username": "string",
    "name": "string",
    "avatar_url": "string | null"
  }
}
```

---

#### `DELETE /api/contacts/:id`
**Auth:** `Bearer <token>`

**Success `200`:**
```json
{
  "message": "Contact removed successfully",
  "id": "string"
}
```

---

### 📊 Stats

#### `GET /api/stats?period=monthly|yearly&last=6`
**Auth:** `Bearer <token>`

**Query params:**
| Param | Type | Default | Description |
|---|---|---|---|
| `period` | string | `monthly` | `monthly` = breakdown by day, `yearly` = breakdown by month |
| `last` | number | `6` | number of months to include |

**Success `200`:**
```json
{
  "period": "monthly",
  "from": "2025-10-01",
  "to": "2026-03-26",
  "totalSent": 25000,
  "totalReceived": 80000,
  "netFlow": 55000,
  "transactionCount": 12,
  "breakdown": [
    { "label": "2025-10-01", "sent": 500, "received": 2000 },
    { "label": "2025-10-02", "sent": 0, "received": 0 }
  ],
  "dailyLimit": {
    "txnUsed": 3,
    "txnLimit": 5,
    "amountUsed": 25000,
    "amountLimit": 50000,
    "feeActive": false
  }
}
```

> `period=monthly` returns every day in the range.
> `period=yearly` returns every month in the range.
> Frontend loads `last=6` once and re-renders locally when user switches views. New request only if going beyond cached range.
