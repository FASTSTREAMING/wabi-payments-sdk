#!/usr/bin/env node

/**
 * Test con tarjeta real para llegar a update-payment
 * Tarjeta: 4218284015172877 07/29 007
 */

const axios = require('axios');
const WabiPayments = require('../src/wabi-client.js');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

async function testRealCardPayment() {
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════════════
  WABI PAYMENTS - TEST CON TARJETA REAL
  Objetivo: Ver respuesta completa de update-payment
═══════════════════════════════════════════════════════════════════${colors.reset}\n`);

  let token, transactionId, encryptedId, orderPaymentId;

  try {
    const client = new WabiPayments();

    // PASO 1: Autenticar
    console.log(`${colors.cyan}[1] Autenticando con Cognito...${colors.reset}`);
    token = await client.generateToken();
    console.log(`${colors.green}✓ Token JWT obtenido${colors.reset}\n`);

    // PASO 2: Crear transacción
    console.log(`${colors.cyan}[2] Creando transacción...${colors.reset}`);
    const transaction = await client.createTransaction();

    transactionId = transaction.id;
    encryptedId = transaction.transaction_id_encrypted;

    console.log(`${colors.green}✓ Transacción creada${colors.reset}`);
    console.log(`  ID: ${transactionId}`);
    console.log(`  Encrypted: ${encryptedId}\n`);

    // PASO 3: Crear orden de pago usando el SDK
    console.log(`${colors.cyan}[3] Creando orden de pago (10 Bs Tigo Prepago)...${colors.reset}`);
    const orderPayment = await client.createOrderPayment({
      transactionId: transactionId,
      serviceCode: 'SINTESIS_TELECEL_PREPAGO',
      amount: 10.00,
      phoneNumber: '69320910',
      debtorInfo: {
        firstName: 'Juan',
        lastName: 'Perez',
        ciCode: '12345678',
        email: 'test@example.com'
      }
    });

    orderPaymentId = orderPayment.id;
    console.log(`${colors.green}✓ Orden creada: ${orderPaymentId}${colors.reset}\n`);

    // PASO 4: Tokenizar tarjeta REAL con dLocal
    console.log(`${colors.cyan}[4] Tokenizando tarjeta real (4218...2877)...${colors.reset}`);

    const cardData = {
      holder_name: 'JUAN PEREZ',
      card_number: '4218284015172877',  // Tarjeta real del usuario
      cvv: '007',
      expiration_month: 7,
      expiration_year: 2029,
      type: 'card'
    };

    console.log(`${colors.yellow}  Intentando tokenización dLocal...${colors.reset}`);

    let cardToken = null;

    // Intento 1: dLocal directo
    try {
      const tokenResponse = await axios.post(
        'https://ppmcc.dlocal.com/v1/tokens',
        cardData,
        {
          headers: {
            'X-API-Key': '3173e25d-501e-4189-aed1-9a7bfac64f30',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Origin': 'https://checkout.wabi.com.bo',
            'Referer': 'https://checkout.wabi.com.bo/'
          }
        }
      );

      cardToken = tokenResponse.data.token || tokenResponse.data.id;
      console.log(`${colors.green}✓ Tarjeta tokenizada: ${cardToken}${colors.reset}\n`);

    } catch (dlocalErr) {
      console.log(`${colors.red}✗ dLocal falló: ${dlocalErr.response?.status} ${dlocalErr.response?.statusText}${colors.reset}`);

      if (dlocalErr.response?.data) {
        console.log(colors.yellow + JSON.stringify(dlocalErr.response.data, null, 2) + colors.reset);
      }

      // Intento 2: Usar endpoint de WABI que tokeniza internamente
      console.log(`${colors.yellow}  Intentando vía WABI...${colors.reset}`);

      try {
        const wabiTokenResp = await axios.post(
          `https://checkout.wabi.com.bo/api/tokenize`,
          cardData,
          {
            headers: {
              'Content-Type': 'application/json',
              'Referer': `https://checkout.wabi.com.bo/payment/${encryptedId}`
            }
          }
        );

        cardToken = wabiTokenResp.data.token;
        console.log(`${colors.green}✓ Tokenizado vía WABI: ${cardToken}${colors.reset}\n`);

      } catch (wabiErr) {
        console.log(`${colors.red}✗ WABI tokenize también falló${colors.reset}\n`);

        // Si ambos fallan, usar el formato esperado pero con datos de prueba
        console.log(`${colors.yellow}⚠️  Usando token dummy para ver formato de respuesta...${colors.reset}\n`);
        cardToken = `CV-${Date.now()}-test-token`;
      }
    }

    // PASO 5: PROCESAR PAGO - update-payment
    console.log(`${colors.magenta}${'═'.repeat(70)}`);
    console.log(`[5] PROCESANDO PAGO - update-payment`);
    console.log(`${'═'.repeat(70)}${colors.reset}\n`);

    const paymentPayload = {
      transaction_id: parseInt(transactionId),
      transaction_id_encrypted: encryptedId,
      payment_id: orderPaymentId,
      amount: {
        currency: 'Bs.',
        value: 10  // MONTO CORRECTO (para control)
      },
      token: cardToken,
      titular_name: 'JUAN PEREZ',
      payment_method: {
        type: 'CARD_PAYMENT'
      }
    };

    console.log(`${colors.cyan}Payload enviado:${colors.reset}`);
    console.log(JSON.stringify(paymentPayload, null, 2) + '\n');

    try {
      const paymentResponse = await axios.post(
        'https://api.wabi.com.bo/v1/payment/card-payment/update-payment',
        paymentPayload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'sec-ch-ua': '"Chromium";v="130", "Google Chrome";v="130"',
            'sec-ch-ua-platform': '"Linux"',
            'Origin': 'https://checkout.wabi.com.bo',
            'Referer': `https://checkout.wabi.com.bo/payment/${encryptedId}`
          }
        }
      );

      console.log(`${colors.green}${'═'.repeat(70)}`);
      console.log(`✅ RESPUESTA EXITOSA DE update-payment`);
      console.log(`${'═'.repeat(70)}${colors.reset}\n`);

      console.log(JSON.stringify(paymentResponse.data, null, 2));

      // Analizar respuesta
      const { paymentId, status, status_code, status_detail, amount, currency, referenceId, card, additionalData } = paymentResponse.data;

      console.log(`\n${colors.cyan}═══ ANÁLISIS DE RESPUESTA ═══${colors.reset}`);
      console.log(`Status: ${status}`);
      console.log(`Status Code: ${status_code || additionalData?.status_code}`);
      console.log(`Detail: ${status_detail || additionalData?.status_detail}`);
      console.log(`Payment ID: ${paymentId}`);
      console.log(`Reference: ${referenceId}`);
      console.log(`Amount: ${amount} ${currency}`);

      if (card) {
        console.log(`\nTarjeta:`);
        console.log(`  Brand: ${card.brand}`);
        console.log(`  Last4: ${card.last4}`);
        console.log(`  Holder: ${card.holder_name}`);
      }

    } catch (paymentErr) {
      console.log(`${colors.red}${'═'.repeat(70)}`);
      console.log(`❌ ERROR EN update-payment`);
      console.log(`${'═'.repeat(70)}${colors.reset}\n`);

      console.log(`HTTP Status: ${paymentErr.response?.status}`);
      console.log(`Error Message: ${paymentErr.message}\n`);

      if (paymentErr.response?.data) {
        console.log(`${colors.yellow}Response Data:${colors.reset}`);
        console.log(JSON.stringify(paymentErr.response.data, null, 2));
      }
    }

    console.log(`\n${colors.green}═══════════════════════════════════════════════════════════════════`);
    console.log(`Test completado`);
    console.log(`═══════════════════════════════════════════════════════════════════${colors.reset}\n`);

  } catch (error) {
    console.error(`\n${colors.red}❌ Error general: ${error.message}${colors.reset}\n`);

    if (error.response) {
      console.log('Response data:');
      console.log(JSON.stringify(error.response.data, null, 2));
    }

    process.exit(1);
  }
}

testRealCardPayment();
