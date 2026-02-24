#!/usr/bin/env node

/**
 * WABI Payments SDK - Test Script
 * Demuestra el flujo completo de creación de transacción y pago
 */

const WabiPayments = require('../src/wabi-client.js');

// Colores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(step, message, data = null) {
  console.log(`${colors.cyan}[${step}]${colors.reset} ${message}`);
  if (data) {
    console.log(`${colors.yellow}${JSON.stringify(data, null, 2)}${colors.reset}\n`);
  }
}

function success(message) {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

function error(message) {
  console.log(`${colors.red}✗ ${message}${colors.reset}`);
}

async function testSDK() {
  console.log(`
${colors.blue}╔════════════════════════════════════════════════════════════════╗
║          WABI PAYMENTS SDK - TEST DE INTEGRACIÓN              ║
╚════════════════════════════════════════════════════════════════╝${colors.reset}
  `);

  try {
    // Inicializar cliente
    log('STEP 1', 'Inicializando cliente WABI Payments...');
    const client = new WabiPayments({
      apiUrl: 'https://api.wabi.com.bo/v1',
      agencyId: 2,
      platformId: 12
    });
    success('Cliente inicializado');

    // Generar token JWT
    log('STEP 2', 'Generando token de autenticación...');
    const token = await client.generateToken();
    log('STEP 2', 'Token JWT generado', {
      token: token.substring(0, 50) + '...',
      length: token.length
    });
    success('Autenticación exitosa');

    // Crear transacción
    log('STEP 3', 'Creando nueva transacción...');
    const transaction = await client.createTransaction();
    log('STEP 3', 'Transacción creada', {
      id: transaction.id,
      encrypted_id: transaction.encrypted_id,
      status: transaction.status
    });
    success(`Transacción ${transaction.id} creada`);

    // Crear orden de pago
    log('STEP 4', 'Creando orden de pago (10 Bs Tigo Prepago)...');
    const orderPayment = await client.createOrderPayment({
      transactionId: transaction.id,
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
    log('STEP 4', 'Orden de pago creada', {
      order_id: orderPayment.id,
      service: orderPayment.service_code,
      amount: orderPayment.amount,
      phone: orderPayment.debtor_info?.phoneNumber
    });
    success(`Orden de pago ${orderPayment.id} creada`);

    // Tokenizar tarjeta (tarjeta de prueba dLocal)
    log('STEP 5', 'Tokenizando tarjeta de prueba...');
    const cardData = {
      pan: '4111111111111111',           // Visa de prueba
      expiration_month: '12',
      expiration_year: '2029',
      cvv: '123',
      holder_name: 'TEST CARDHOLDER'
    };

    const cardToken = await client.tokenizeCard(cardData);
    log('STEP 5', 'Tarjeta tokenizada', {
      token: cardToken.token,
      brand: cardToken.brand,
      last4: cardToken.last_four_digits
    });
    success('Tokenización exitosa');

    // Procesar pago
    log('STEP 6', 'Procesando pago...');
    const payment = await client.processPayment({
      transactionId: transaction.id,
      orderPaymentId: orderPayment.id,
      encryptedTransactionId: transaction.encrypted_id,
      cardToken: cardToken.token,
      amount: 10.00,  // Monto real
      debtorInfo: {
        firstName: 'Juan',
        lastName: 'Perez',
        ciCode: '12345678',
        email: 'test@example.com'
      }
    });
    log('STEP 6', 'Pago procesado', {
      payment_id: payment.payment_id,
      status: payment.status,
      amount: payment.amount
    });
    success('Pago enviado a procesamiento');

    // Completar pago (opcional)
    log('STEP 7', 'Completando transacción...');
    const completed = await client.completePayment({
      transactionId: transaction.id,
      encryptedTransactionId: transaction.encrypted_id
    });
    log('STEP 7', 'Transacción completada', completed);
    success('Flujo completo ejecutado');

    console.log(`
${colors.green}╔════════════════════════════════════════════════════════════════╗
║                    ✓ TEST EXITOSO                             ║
╠════════════════════════════════════════════════════════════════╣
║  Transacción ID: ${transaction.id.toString().padEnd(43)}║
║  Orden de Pago:  ${orderPayment.id.toString().padEnd(43)}║
║  Monto:          10 Bs                                         ║
║  Servicio:       Tigo Prepago                                  ║
║  Token:          ${cardToken.token.substring(0, 20)}...                       ║
╚════════════════════════════════════════════════════════════════╝${colors.reset}
    `);

  } catch (err) {
    error('Error durante el test:');
    console.error(err);

    if (err.response) {
      console.log('\nRespuesta del servidor:');
      console.log(JSON.stringify(err.response.data, null, 2));
    }

    process.exit(1);
  }
}

// Ejecutar test
testSDK();
