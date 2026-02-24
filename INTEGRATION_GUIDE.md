# WABI Payments Integration Guide

This guide explains how to integrate WABI Digital payment gateway into your application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Payment Flow](#payment-flow)
5. [Service Configuration](#service-configuration)
6. [Testing](#testing)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have:

- Node.js 14+ or Python 3.7+
- NPM or Pip package manager
- Basic understanding of async/await patterns
- HTTPS-enabled domain (for production)

### API Access

The WABI API is accessible at:
- **Base URL**: `https://api.wabi.com.bo/v1`
- **Authentication**: JWT via AWS Cognito
- **Payment Processor**: dLocal

---

## Installation

### Node.js

```bash
npm install wabi-payments-sdk
```

### Python

```bash
pip install wabi-payments-sdk
```

---

## Quick Start

### Node.js Example

```javascript
const WabiPayments = require('wabi-payments-sdk');

const client = new WabiPayments({
  agencyId: 2,
  platformId: 12
});

// Create and process payment
const result = await client.completePayment({
  serviceCode: 'SINTESIS_TELECEL_PREPAGO',
  amount: 10.00,
  phoneNumber: '69320910',
  debtorInfo: {
    firstName: 'Juan',
    lastName: 'Perez',
    ciCode: '12345678'
  },
  cardData: {
    pan: '4111111111111111',
    cvv: '123',
    expirationMonth: '12',
    expirationYear: '2025',
    holderName: 'Juan Perez'
  }
});

console.log('Payment status:', result.payment.status);
```

### Python Example

```python
from wabi_payments_sdk import WabiPaymentsClient

client = WabiPaymentsClient({
    'agency_id': 2,
    'platform_id': 12
})

# Create and process payment
result = client.complete_payment({
    'service_code': 'SINTESIS_TELECEL_PREPAGO',
    'amount': 10.00,
    'phone_number': '69320910',
    'debtor_info': {
        'first_name': 'Juan',
        'last_name': 'Perez',
        'ci_code': '12345678'
    },
    'card_data': {
        'pan': '4111111111111111',
        'cvv': '123',
        'expiration_month': '12',
        'expiration_year': '2025',
        'holder_name': 'Juan Perez'
    }
})

print('Payment status:', result['payment']['status'])
```

---

## Payment Flow

The complete payment flow consists of 6 steps:

```
1. Generate Authentication Token
   ↓
2. Create Transaction
   ↓
3. Add Service Order
   ↓
4. Update Customer Info (optional)
   ↓
5. Tokenize Card via dLocal
   ↓
6. Process Payment
```

### Step-by-Step Implementation

#### Step 1: Authentication

```javascript
const token = await client.generateToken();
// Token is automatically stored in client instance
```

#### Step 2: Create Transaction

```javascript
const transaction = await client.createTransaction();
// Returns: {id, transaction_id_encrypted, url_redirect_checkout}
```

#### Step 3: Add Service Order

```javascript
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
```

#### Step 4: Update Customer (Optional)

```javascript
await client.updateCustomerPayer({
  transactionId: transaction.id,
  firstName: 'Juan',
  lastName: 'Perez',
  email: 'juan@example.com',
  phone: '69320910'
});
```

#### Step 5: Tokenize Card

```javascript
const cardToken = await client.tokenizeCard({
  pan: '4111111111111111',
  cvv: '123',
  expirationMonth: '12',
  expirationYear: '2025',
  holderName: 'Juan Perez'
});
```

#### Step 6: Process Payment

```javascript
const payment = await client.processPayment({
  transactionId: transaction.id,
  transactionIdEncrypted: transaction.transaction_id_encrypted,
  paymentId: order.id,
  amount: 10,
  cardToken: cardToken,
  cardholderName: 'Juan Perez'
});
```

---

## Service Configuration

### Available Services

#### Telecom Services

```javascript
// Tigo Prepaid
serviceCode: 'SINTESIS_TELECEL_PREPAGO'
phoneNumber: '69320910'

// Tigo Home/Internet
serviceCode: 'SINTESIS_TELECEL_HOME'
accountNumber: '12345678'

// Entel Prepaid
serviceCode: 'SINTESIS_ENTEL_PREPAGO'
phoneNumber: '76543210'
```

#### Utility Services

```javascript
// Water (SAGUAPAC)
serviceCode: 'SINTESIS_SAGUAPAC'
accountNumber: '123456'

// Electricity (ELFEC)
serviceCode: 'SINTESIS_ELFEC'
accountNumber: '789012'
```

### Service Catalog API

Retrieve all available services:

```javascript
const services = await client.getServices();

services.forEach(service => {
  console.log(`${service.service_name} (${service.service_code})`);
});
```

---

## Testing

### Test Environment

Use test card numbers for development:

```javascript
// Visa test card
{
  pan: '4111111111111111',
  cvv: '123',
  expirationMonth: '12',
  expirationYear: '2025',
  holderName: 'Test User'
}
```

### Running Tests

```bash
# Node.js
npm test

# Python
pytest
```

### Example Test

```javascript
const assert = require('assert');
const WabiPayments = require('wabi-payments-sdk');

describe('WABI Payments', () => {
  it('should create transaction', async () => {
    const client = new WabiPayments();
    const transaction = await client.createTransaction();

    assert(transaction.id);
    assert(transaction.transaction_id_encrypted);
  });

  it('should tokenize card', async () => {
    const client = new WabiPayments();
    const token = await client.tokenizeCard({
      pan: '4111111111111111',
      cvv: '123',
      expirationMonth: '12',
      expirationYear: '2025',
      holderName: 'Test User'
    });

    assert(token.startsWith('CV-'));
  });
});
```

---

## Production Deployment

### Environment Variables

```bash
WABI_API_URL=https://api.wabi.com.bo/v1
WABI_AGENCY_ID=2
WABI_PLATFORM_ID=12
DLOCAL_KEY=3173e25d-501e-4189-aed1-9a7bfac64f30
```

### Security Best Practices

1. **Never store raw card numbers**
   - Always use dLocal tokenization
   - Tokens are single-use only

2. **Use HTTPS everywhere**
   - All communication must be over SSL/TLS
   - Verify SSL certificates

3. **Implement proper error handling**
   ```javascript
   try {
     const result = await client.completePayment(params);
   } catch (error) {
     console.error('Payment failed:', error.message);
     // Handle error appropriately
   }
   ```

4. **Log transactions for auditing**
   ```javascript
   console.log({
     timestamp: new Date(),
     transactionId: transaction.id,
     amount: params.amount,
     service: params.serviceCode
   });
   ```

5. **Implement rate limiting**
   - Limit API calls per minute
   - Implement exponential backoff for retries

### Production Checklist

- [ ] SSL/TLS certificate installed
- [ ] Environment variables configured
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Rate limiting implemented
- [ ] PCI compliance reviewed
- [ ] Backup payment method configured
- [ ] Monitoring and alerting set up

---

## Troubleshooting

### Common Issues

#### 1. "Lambda core error"

**Cause**: Payment processor error or invalid card data

**Solution**:
- Verify card number, CVV, and expiration date
- Ensure card has sufficient funds
- Check if card is enabled for international transactions
- Try with a different card

#### 2. "Missing Authentication Token"

**Cause**: JWT token expired or invalid

**Solution**:
```javascript
// Regenerate token
await client.generateToken();
```

#### 3. "Unauthorized"

**Cause**: Invalid credentials

**Solution**:
- Verify Cognito username and password
- Check if credentials are properly configured

#### 4. CORS Errors

**Cause**: Origin not whitelisted

**Solution**:
```javascript
// Ensure proper origin header
headers: {
  'origin': 'https://checkout.wabi.com.bo'
}
```

### Debug Mode

Enable debug logging:

```javascript
// Node.js
process.env.DEBUG = 'wabi:*';

// Python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### API Response Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Continue |
| 401 | Unauthorized | Regenerate token |
| 404 | Not Found | Check endpoint URL |
| 500 | Server Error | Retry with backoff |

---

## Support

### Resources

- **Documentation**: [API Reference](./docs/API_REFERENCE.md)
- **Examples**: [examples/](./examples/)
- **GitHub Issues**: https://github.com/yourusername/wabi-payments-sdk/issues

### Getting Help

1. Check the [API Reference](./docs/API_REFERENCE.md)
2. Review [examples](./examples/)
3. Search [existing issues](https://github.com/yourusername/wabi-payments-sdk/issues)
4. Create a new issue with:
   - SDK version
   - Error message
   - Minimal reproduction code

---

## Next Steps

- Explore [complete examples](./examples/)
- Review [API documentation](./docs/API_REFERENCE.md)
- Join the community discussions
- Contribute improvements

---

**Happy integrating! 🚀**
