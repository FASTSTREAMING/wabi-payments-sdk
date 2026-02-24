# WABI Payments SDK

> 🚀 Unofficial Node.js/Python SDK for WABI Digital payment gateway integration

[![npm version](https://img.shields.io/badge/npm-v1.0.0-blue.svg)](https://www.npmjs.com/package/wabi-payments-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

WABI Digital is a payment gateway platform for basic services in Bolivia (Tigo, Entel, electricity, water, etc.). This SDK provides a simple interface to integrate WABI's payment infrastructure into your applications.

## 🎯 Features

- ✅ Transaction creation and management
- ✅ Order payment processing
- ✅ dLocal card tokenization
- ✅ Real-time payment status tracking
- ✅ Customer data management
- ✅ Service catalog integration
- ✅ Full TypeScript support

## 📦 Installation

```bash
npm install wabi-payments-sdk
# or
pip install wabi-payments-sdk
```

## 🚀 Quick Start

### Creating a Payment Transaction

```javascript
const WabiPayments = require('wabi-payments-sdk');

const client = new WabiPayments({
  apiUrl: 'https://api.wabi.com.bo/v1',
  agencyId: 2,
  platformId: 12
});

// Step 1: Create transaction
const transaction = await client.createTransaction();
console.log('Transaction ID:', transaction.id);
console.log('Checkout URL:', transaction.url_redirect_checkout);

// Step 2: Add service order (Tigo Prepaid)
const order = await client.createOrderPayment({
  transactionId: transaction.id,
  serviceCode: 'SINTESIS_TELECEL_PREPAGO',
  amount: 10.00,
  phoneNumber: '69320910',
  debtorInfo: {
    firstName: 'Juan',
    lastName: 'Perez',
    ciCode: '12345678'
  }
});

// Step 3: Process payment
const payment = await client.processPayment({
  transactionId: transaction.id,
  paymentId: order.id,
  cardData: {
    pan: '4111111111111111',
    cvv: '123',
    expirationMonth: '12',
    expirationYear: '2025',
    holderName: 'Juan Perez'
  }
});

console.log('Payment status:', payment.status);
```

## 📚 Full API Documentation

### Authentication

WABI API uses JWT-based authentication via AWS Cognito:

```javascript
// Generate authentication token
const token = await client.generateToken({
  username: '076f7a740acf31cf9b111d4e',
  password: '0b194b147ef825c3d1281338'
});
```

**Token details:**
- User Pool: `us-east-1_YvWkdeUGd`
- App Client: `2eov7gcg7bfc1hb6uqj6555jtm`
- Email: `wabi@wabi.com.bo`
- Expiration: 4 hours

### Core Endpoints

#### 1. Transaction Management

##### Create Transaction
```http
POST /v1/transaction/create
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
  "transaction_id_encrypted": "ww0B-IM_25gmI-LzAGaFng",
  "url_redirect_checkout": "https://checkout.wabi.com.bo/payment/ww0B-IM_25gmI-LzAGaFng",
  "amount": {"currency": null, "value": "0.00"},
  "order_payments": []
}
```

##### Get Transaction
```http
GET /v1/core/transaction/findOrderPay/{encrypted_id}
```

#### 2. Order Payment

##### Create Order Payment
```http
POST /v1/core/order-payment/create
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "transaction_id": "2602231088",
  "description": "Pago de Servicio Síntesis",
  "service_code": "SINTESIS_TELECEL_PREPAGO",
  "debtor_first_name": "Juan",
  "debtor_last_name": "Perez",
  "debtor_ci_code": "12345678",
  "invoice_name": "Juan Perez",
  "invoice_type": "1",
  "invoice_document_number": "12345678",
  "amount": {
    "currency": "Bs",
    "value": "10.00"
  },
  "additional_commerce": "{\"account\":\"69320910\",\"service\":\"11\",\"sub_service\":\"SINTESIS_TELECEL_PREPAGO\",\"items\":[{\"code\":\"0001\",\"amount\":10,\"description\":\"Monto a Recargar\"}]}",
  "items": [{
    "description": "Monto a Recargar",
    "unit_price": "10.00",
    "quantity": "1",
    "discount": "0.00"
  }]
}
```

#### 3. Payment Processing

##### Tokenize Card (dLocal)
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

##### Process Payment
```http
POST /v1/payment/card-payment/update-payment
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
  "token": "CV-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "titular_name": "Juan Perez",
  "payment_method": {
    "type": "CARD_PAYMENT"
  }
}
```

#### 4. Customer Management

##### Update Customer Payer
```http
PUT /v1/core/customer-payer/update
Content-Type: application/json

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

### Service Catalog

#### Available Services

| Service Code | Name | Provider |
|--------------|------|----------|
| `SINTESIS_TELECEL_PREPAGO` | Tigo Prepaid | Tigo Bolivia |
| `SINTESIS_TELECEL_HOME` | Tigo Home | Tigo Bolivia |
| `SINTESIS_ENTEL_PREPAGO` | Entel Prepaid | Entel Bolivia |
| `SINTESIS_VIVA_PREPAGO` | Viva Prepaid | Viva Bolivia |

#### Get All Services
```http
GET /v1/core/service/find-all-service-commerce?agency_id=2&plattform_id=12
```

### Commerce Workflow Endpoints

For advanced integrations using the service dialog flow:

```http
POST /v1/commerce/view/get-views
POST /v1/commerce/payment-workflow/search-client
POST /v1/commerce/payment-workflow/get-fees
POST /v1/commerce/payment-workflow/get-order
POST /v1/commerce/payment-workflow/new-payment
```

## 🔑 Configuration

### Required Headers

All API requests require the following browser-like headers:

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
  'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5)'
}
```

### dLocal Configuration

```javascript
{
  tokenizationEndpoint: 'https://ppmcc.dlocal.com/cvault/credit-card/temporal',
  apiKey: '3173e25d-501e-4189-aed1-9a7bfac64f30',
  countryCode: 'BO'
}
```

## 📖 Usage Examples

See the [examples](./examples) directory for complete working examples:

- [Basic payment flow](./examples/basic-payment.js)
- [Multiple services checkout](./examples/multi-service.js)
- [Customer management](./examples/customer-management.js)
- [Payment status polling](./examples/payment-polling.js)

## 🏗️ Architecture

```
┌─────────────────┐
│   Your App      │
└────────┬────────┘
         │
         v
┌─────────────────┐      ┌──────────────────┐
│  WABI SDK       │─────>│  AWS Cognito     │
│  (this library) │      │  Authentication  │
└────────┬────────┘      └──────────────────┘
         │
         v
┌─────────────────────────────────────────┐
│         WABI API Gateway                │
│   (api.wabi.com.bo/v1)                  │
├─────────────────────────────────────────┤
│  • Transaction Management               │
│  • Order Payment Processing             │
│  • Customer Data                        │
│  • Service Catalog                      │
└────────┬────────────────────────────────┘
         │
         v
┌─────────────────┐      ┌──────────────────┐
│  dLocal         │      │  Service         │
│  Payment        │      │  Providers       │
│  Processing     │      │  (Tigo, Entel)   │
└─────────────────┘      └──────────────────┘
```

## 🔍 Response Examples

### Successful Payment
```json
{
  "paymentId": "T-1445912-x1kppuhu-e53v09uach1697-5p3tucepml3g",
  "status": "PAID",
  "amount": "10.00",
  "currency": "BOB",
  "referenceId": "26022310881"
}
```

### Error Response
```json
{
  "message": "An error occurred",
  "error": "Lambda core error: Unknown error"
}
```

## 🛠️ Development

### Setting Up Development Environment

```bash
git clone https://github.com/yourusername/wabi-payments-sdk.git
cd wabi-payments-sdk
npm install
npm test
```

### Running Tests

```bash
npm run test
npm run test:integration
```

### Building

```bash
npm run build
```

## 📊 Rate Limits

No official rate limits are documented. Use responsibly.

## 🔒 Security

- All communication uses HTTPS
- JWT tokens expire after 4 hours
- Card data is tokenized via dLocal (PCI-DSS compliant)
- Never store raw card numbers

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) first.

## 📝 License

MIT License - see [LICENSE](./LICENSE) file for details.

## ⚠️ Disclaimer

This is an **unofficial** SDK created for educational and integration purposes. WABI Digital is a registered trademark of Multicenter Corp. This project is not affiliated with, authorized, maintained, sponsored or endorsed by WABI Digital or any of its affiliates or subsidiaries.

Use at your own risk. Ensure you have proper authorization before integrating with production systems.

## 📞 Support

- 📧 Email: support@example.com
- 💬 Issues: [GitHub Issues](https://github.com/yourusername/wabi-payments-sdk/issues)
- 📚 Docs: [Full Documentation](https://wabi-payments-sdk.readthedocs.io)

## 🎯 Roadmap

- [ ] WebSocket support for real-time payment updates
- [ ] React Native SDK
- [ ] Python async/await support
- [ ] CLI tool for quick testing
- [ ] Webhook integration
- [ ] Payment analytics dashboard

---

**Made with ❤️ for the Bolivian fintech community**
