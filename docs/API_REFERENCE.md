# WABI Payments API Reference

Complete API documentation for WABI Digital payment gateway integration.

## Base URL

```
https://api.wabi.com.bo/v1
```

## Authentication

WABI uses JWT tokens issued by AWS Cognito for authentication.

### Generate Token

```http
POST /transaction/generateToken
Content-Type: application/json

{
  "username": "076f7a740acf31cf9b111d4e",
  "password": "0b194b147ef825c3d1281338"
}
```

**Response:**
```json
{
  "token": "eyJraWQiOiJzTmI4alZOM09KVWU5YTgxXC84SENCN1BxZExOXC9UUXVEQzVtWnlyTExZVlE9IiwiYWxnIjoiUlMyNTYifQ..."
}
```

**Token Details:**
- Type: JWT (JSON Web Token)
- Issuer: AWS Cognito
- User Pool: `us-east-1_YvWkdeUGd`
- App Client: `2eov7gcg7bfc1hb6uqj6555jtm`
- Expiration: 4 hours (14400 seconds)
- Claims: `sub`, `email`, `cognito:username`, `name`

---

## Core Endpoints

### 1. Transaction Management

#### Create Transaction

Creates a new empty transaction.

```http
POST /transaction/create
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "agency_id": 2,
  "plattform_id": 12
}
```

**Response:**
```json
{
  "id": "2602231088",
  "date_time": "23/02/2026, 10:44:07 PM",
  "created_at": "23/02/2026, 10:44:07 PM",
  "agency_id": 2,
  "plattform_id": 12,
  "type_transaction": 1,
  "amount": {
    "currency": null,
    "value": "0.00"
  },
  "order_payments": [],
  "transaction_id_encrypted": "ww0B-IM_25gmI-LzAGaFng",
  "url_redirect_checkout": "https://checkout.wabi.com.bo/payment/ww0B-IM_25gmI-LzAGaFng",
  "url_redirect_origin": "https://www.wabi.com.bo/services/transaction/ww0B-IM_25gmI-LzAGaFng"
}
```

#### Get Transaction

Retrieves transaction details by encrypted ID.

```http
GET /core/transaction/findOrderPay/{encrypted_id}
```

**Example:**
```
GET /core/transaction/findOrderPay/ww0B-IM_25gmI-LzAGaFng
```

**Response:**
```json
{
  "id": "2602231088",
  "date_time": "23/02/2026, 10:44:07 PM",
  "amount": {
    "currency": "Bs",
    "value": "10.00"
  },
  "order_payments": [
    {
      "id": "26022310881",
      "amount": "10.000000",
      "currency": "Bs",
      "description": "Pago de Servicio Síntesis",
      "payment_status": "Pending",
      "service_name": "Service Collect - Sintesis Tigo Prepago",
      "service_code": "SINTESIS_TELECEL_PREPAGO"
    }
  ],
  "customer_payer": {
    "first_name": "Juan",
    "last_name": "Perez",
    "email": "juan@example.com",
    "phone": "69320910"
  }
}
```

#### Confirm Transaction

Confirms a transaction after all order payments are added.

```http
POST /core/transaction/confirm-transaction
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "transaction_id": 2602231088
}
```

---

### 2. Order Payment Management

#### Create Order Payment

Adds a service order to an existing transaction.

```http
POST /core/order-payment/create
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "transaction_id": "2602231088",
  "description": "Pago de Servicio Síntesis",
  "service_code": "SINTESIS_TELECEL_PREPAGO",
  "debtor_first_name": "Juan",
  "debtor_last_name": "Perez",
  "debtor_phone": "",
  "debtor_ci_code": "12345678",
  "invoice_name": "Juan Perez",
  "invoice_type": "1",
  "invoice_document_number": "12345678",
  "additional_data": "{}",
  "additional_commerce": "{\"account\":\"69320910\",\"service\":\"11\",\"sub_service\":\"SINTESIS_TELECEL_PREPAGO\",\"items\":[{\"code\":\"0001\",\"amount\":10,\"description\":\"Monto a Recargar\"}]}",
  "is_billable": 1,
  "amount": {
    "currency": "Bs",
    "value": "10.00"
  },
  "items": [
    {
      "description": "Monto a Recargar",
      "unit_price": "10.00",
      "quantity": "1",
      "discount": "0.00",
      "detail_type": "1"
    }
  ]
}
```

**Response:**
```json
{
  "id": "26022310881",
  "description": "Pago de Servicio Síntesis",
  "payment_status": "Pending",
  "amount": {
    "currency": "Bs",
    "value": "10.00"
  },
  "service_id": 29,
  "service_code": "SINTESIS_TELECEL_PREPAGO",
  "service_name": "Tigo",
  "transaction_id": "2602231088",
  "items": [...]
}
```

---

### 3. Customer Management

#### Update Customer Payer

Updates customer information for a transaction.

```http
PUT /core/customer-payer/update
Content-Type: application/json
Origin: https://checkout.wabi.com.bo

{
  "customer_payer": {
    "transaction_id": "2602231088",
    "first_name": "Juan",
    "last_name": "Perez",
    "email": "juan.perez@example.com",
    "phone": "69320910",
    "document": {
      "document_type": "",
      "business_name": "",
      "document_number": ""
    }
  }
}
```

---

### 4. Service Catalog

#### Get All Services

Retrieves the list of available services.

```http
GET /core/service/find-all-service-commerce?customerId=&agency_id=2&plattform_id=12&department_id=3
```

**Response:**
```json
[
  {
    "id": 29,
    "service_code": "SINTESIS_TELECEL_PREPAGO",
    "service_name": "Tigo Prepaid",
    "short_name": "Tigo",
    "service_logo": "https://wabi-dev-assests.s3.us-east-1.amazonaws.com/commerce-logos/svg/tigo.svg",
    "service_status": "Enabled",
    "category_service_id": 1,
    "company_id": 5
  }
]
```

#### Get Service Groups

```http
GET /core/service/find-all-group-service-commerce?customerId=&agency_id=2&plattform_id=12&department_id=3
```

#### Get Service by Code

```http
GET /core/service/find-by-code/{service_code}
```

---

### 5. Payment Processing

#### Process Card Payment

Processes a payment using a tokenized card.

```http
POST /payment/card-payment/update-payment
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "transaction_id": 2602231088,
  "transaction_id_encrypted": "ww0B-IM_25gmI-LzAGaFng",
  "payment_id": "26022310881",
  "amount": {
    "currency": "Bs.",
    "value": 10
  },
  "token": "CV-cf7e1d48-9883-4850-84d9-68e97cc9839a",
  "titular_name": "Juan Perez",
  "payment_method": {
    "type": "CARD_PAYMENT"
  }
}
```

**Success Response:**
```json
{
  "paymentId": "T-1445912-x1kppuhu-e53v09uach1697-5p3tucepml3g",
  "status": "PAID",
  "amount": "10.00",
  "currency": "BOB",
  "referenceId": "26022310881"
}
```

**Error Response:**
```json
{
  "message": "An error occurred",
  "error": "Lambda core error: Unknown error"
}
```

---

## dLocal Integration

### Card Tokenization

WABI uses dLocal for PCI-compliant card tokenization.

```http
POST https://ppmcc.dlocal.com/cvault/credit-card/temporal
Content-Type: application/json

{
  "pan": "4111111111111111",
  "cvv": "123",
  "expiration_month": "12",
  "expiration_year": "2025",
  "holder_name": "Juan Perez",
  "key": "3173e25d-501e-4189-aed1-9a7bfac64f30",
  "country_code": "BO"
}
```

**Response:**
```json
{
  "token": "CV-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

**Configuration:**
- Endpoint: `https://ppmcc.dlocal.com/cvault/credit-card/temporal`
- API Key: `3173e25d-501e-4189-aed1-9a7bfac64f30`
- Country: `BO` (Bolivia)
- Token Format: `CV-{UUID}`
- Token Lifetime: Single use

---

## Commerce Workflow Endpoints

Advanced commerce flow for service dialogs.

### Get Views

Retrieves form views for a service.

```http
POST /commerce/view/get-views
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "service_code": "SINTESIS_TELECEL_PREPAGO",
  "transaction_id": "2602231088"
}
```

### Search Client

Searches for existing client data.

```http
POST /commerce/payment-workflow/search-client
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "service_code": "SINTESIS_TELECEL_PREPAGO",
  "order_id": "26022310881",
  "form_data": {...}
}
```

### Get Fees

Retrieves fees/debts for a service.

```http
POST /commerce/payment-workflow/get-fees
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "transaction_id": "2602231088",
  "order_id": "26022310881",
  "service_code": "SINTESIS_TELECEL_PREPAGO",
  "form_data": [...],
  "extra_data": {}
}
```

### Process Order

Processes the order through the commerce workflow.

```http
POST /commerce/payment-workflow/get-order
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "transaction_id": "2602231088",
  "service_code": "SINTESIS_TELECEL_PREPAGO",
  "order_data": {...}
}
```

### New Payment

Alternative payment endpoint through commerce workflow.

```http
POST /commerce/payment-workflow/new-payment
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "order_id": "26022310881",
  "payment_data": {...}
}
```

---

## Service Codes

### Telecom Services

| Code | Service | Provider |
|------|---------|----------|
| `SINTESIS_TELECEL_PREPAGO` | Prepaid Mobile | Tigo Bolivia |
| `SINTESIS_TELECEL_HOME` | Home Internet/TV | Tigo Bolivia |
| `SINTESIS_ENTEL_PREPAGO` | Prepaid Mobile | Entel Bolivia |
| `SINTESIS_VIVA_PREPAGO` | Prepaid Mobile | Viva Bolivia |

### Utilities

| Code | Service | Provider |
|------|---------|----------|
| `SINTESIS_SAGUAPAC` | Water | SAGUAPAC |
| `SINTESIS_ELFEC` | Electricity | ELFEC |
| `SINTESIS_COTAS` | Internet | COTAS |

---

## Required Headers

All requests must include browser-like headers:

```javascript
{
  'accept': 'application/json',
  'content-type': 'application/json',
  'origin': 'https://checkout.wabi.com.bo',
  'referer': 'https://checkout.wabi.com.bo/',
  'sec-ch-ua': '"Chromium";v="142"',
  'sec-ch-ua-mobile': '?1',
  'sec-ch-ua-platform': '"Android"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
  'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5) AppleWebKit/537.36'
}
```

**Origin variations by endpoint:**
- Transaction/Order management: `https://www.wabi.com.bo`
- Payment processing: `https://checkout.wabi.com.bo`
- Customer updates: `https://checkout.wabi.com.bo`

---

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| `INTERNAL_SERVER_ERROR` | Various | Server-side error |
| `Lambda core error` | Unknown error | Lambda function error |
| `Missing Authentication Token` | - | JWT token missing or invalid |
| `Unauthorized` | - | Invalid credentials |

---

## Rate Limits

⚠️ **No official rate limits documented.** Use responsibly to avoid service disruption.

---

## CORS

WABI API allows cross-origin requests from:
- `https://www.wabi.com.bo`
- `https://checkout.wabi.com.bo`
- `https://console.wabi.com.bo`

**CORS Headers:**
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: *
Access-Control-Allow-Methods: *
```

---

## Infrastructure

- **API Gateway**: AWS API Gateway (us-east-1)
  - `d-uhkep4rtj7.execute-api.us-east-1.amazonaws.com` (prod)
  - `d-1e601im4ei.execute-api.us-east-1.amazonaws.com` (dev)
- **Frontend**: AWS CloudFront + S3
- **Authentication**: AWS Cognito (us-east-1_YvWkdeUGd)
- **Payment Processor**: dLocal (ppmcc.dlocal.com)
- **Database**: PostgreSQL (inferred from error messages)

---

## Testing

### Test Card Numbers

For testing in non-production environments:

```
Card: 4111111111111111
CVV: 123
Exp: 12/2025
Name: Test User
```

⚠️ **Note:** Test cards may not work in production. Use real cards with caution.

---

## Support

For issues or questions:
- GitHub: https://github.com/yourusername/wabi-payments-sdk/issues
- Email: support@example.com

---

Last updated: 2026-02-24
