#!/usr/bin/env node

/**
 * WABI Payments SDK - Complete Payment Flow Test
 * Prueba el flujo completo incluyendo update-payment para ver status codes de dLocal
 */

const axios = require('axios');
const WabiPayments = require('../src/wabi-client.js');

// Colores
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(step, message, data = null) {
  console.log(`\n${colors.cyan}[${step}]${colors.reset} ${message}`);
  if (data) {
    console.log(`${colors.yellow}${JSON.stringify(data, null, 2)}${colors.reset}`);
  }
}

function highlight(message) {
  console.log(`\n${colors.magenta}${'═'.repeat(70)}${colors.reset}`);
  console.log(`${colors.magenta}${message}${colors.reset}`);
  console.log(`${colors.magenta}${'═'.repeat(70)}${colors.reset}`);
}

async function testPaymentFlow() {
  console.log(`
${colors.blue}╔═══════════════════════════════════════════════════════════════════╗
║        WABI PAYMENTS - TEST COMPLETO DE FLUJO DE PAGO            ║
║        Objetivo: Llegar a update-payment y ver status codes      ║
╚═══════════════════════════════════════════════════════════════════╝${colors.reset}
  `);

  let transactionId, orderPaymentId, encryptedId, token;

  try {
    const client = new WabiPayments();

    // PASO 1: Autenticación
    log('PASO 1', 'Autenticación con AWS Cognito');
    token = await client.generateToken();
    console.log(`${colors.green}✓ Token JWT generado (${token.length} chars)${colors.reset}`);

    // PASO 2: Crear transacción
    log('PASO 2', 'Creando nueva transacción');
    const transaction = await client.createTransaction();
    transactionId = transaction.id;
    encryptedId = transaction.encrypted_id || `encrypted_${transactionId}`;
    log('PASO 2', 'Transacción creada', {
      id: transactionId,
      encrypted_id: encryptedId
    });

    // PASO 3: Crear orden de pago
    log('PASO 3', 'Creando orden de pago (10 Bs Tigo Prepago)');
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
    log('PASO 3', 'Orden de pago creada', {
      id: orderPaymentId,
      amount: orderPayment.amount,
      service: orderPayment.service_code
    });

    // PASO 4: Tokenizar tarjeta
    log('PASO 4', 'Tokenizando tarjeta (probando diferentes formatos)');

    let cardToken;

    // Intento 1: Tarjeta de prueba dLocal con formato completo
    try {
      console.log(`${colors.yellow}  Intento 1: Tarjeta de prueba dLocal (4111111111111111)${colors.reset}`);

      const dlocalResponse = await axios.post('https://ppmcc.dlocal.com/v1/tokens', {
        holder_name: 'TEST CARDHOLDER',
        card_number: '4111111111111111',
        cvv: '123',
        expiration_month: 12,
        expiration_year: 2029,
        type: 'card'
      }, {
        headers: {
          'X-API-Key': client.dlocalKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      cardToken = {
        token: dlocalResponse.data.token || dlocalResponse.data.id,
        brand: dlocalResponse.data.brand,
        last_four_digits: '1111'
      };

      log('PASO 4', 'Tokenización exitosa (Intento 1)', cardToken);

    } catch (err1) {
      console.log(`${colors.red}  ✗ Intento 1 falló: ${err1.message}${colors.reset}`);

      // Intento 2: Tarjeta APPROVED de dLocal (específica para Bolivia)
      try {
        console.log(`${colors.yellow}  Intento 2: Tarjeta APPROVED dLocal Bolivia (5314282011948430)${colors.reset}`);

        const dlocalResponse2 = await axios.post('https://ppmcc.dlocal.com/v1/tokens', {
          holder_name: 'APPROVED',
          card_number: '5314282011948430',
          cvv: '123',
          expiration_month: 12,
          expiration_year: 2029,
          type: 'card'
        }, {
          headers: {
            'X-API-Key': client.dlocalKey,
            'Content-Type': 'application/json'
          }
        });

        cardToken = {
          token: dlocalResponse2.data.token || dlocalResponse2.data.id,
          brand: dlocalResponse2.data.brand || 'MC',
          last_four_digits: '8430'
        };

        log('PASO 4', 'Tokenización exitosa (Intento 2)', cardToken);

      } catch (err2) {
        console.log(`${colors.red}  ✗ Intento 2 falló: ${err2.message}${colors.reset}`);

        // Intento 3: Usar endpoint interno de WABI
        console.log(`${colors.yellow}  Intento 3: Usando endpoint interno de WABI${colors.reset}`);

        try {
          const wabiTokenResponse = await axios.post(
            'https://api.wabi.com.bo/v1/payment/card-payment/tokenize',
            {
              card_number: '4111111111111111',
              holder_name: 'TEST CARDHOLDER',
              cvv: '123',
              expiration_month: '12',
              expiration_year: '2029'
            },
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );

          cardToken = wabiTokenResponse.data;
          log('PASO 4', 'Tokenización exitosa (Intento 3 - WABI)', cardToken);

        } catch (err3) {
          console.log(`${colors.red}  ✗ Intento 3 falló: ${err3.message}${colors.reset}`);

          // Si todo falla, usar token de prueba (puede fallar en payment pero veremos la respuesta)
          console.log(`${colors.yellow}  Usando token de prueba hardcoded para continuar el flujo${colors.reset}`);
          cardToken = {
            token: 'test_token_' + Date.now(),
            brand: 'VI',
            last_four_digits: '1111'
          };
        }
      }
    }

    // PASO 5: Procesar pago
    highlight('PASO 5: PROCESANDO PAGO - AQUÍ VEREMOS LA RESPUESTA COMPLETA');

    const paymentData = {
      transaction_id: transactionId,
      encrypted_transaction_id: encryptedId,
      order_payment_id: orderPaymentId,
      card_token: cardToken.token,
      amount: 10.00,  // Monto correcto
      currency: 'BOB',
      debtor_info: {
        first_name: 'Juan',
        last_name: 'Perez',
        ci_code: '12345678',
        email: 'test@example.com'
      }
    };

    console.log(`${colors.cyan}Datos del pago a enviar:${colors.reset}`);
    console.log(JSON.stringify(paymentData, null, 2));

    try {
      const paymentResponse = await axios.post(
        'https://api.wabi.com.bo/v1/payment/card-payment/update-payment',
        paymentData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'sec-ch-ua': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
            'sec-ch-ua-platform': '"Linux"',
            'Origin': 'https://checkout.wabi.com.bo',
            'Referer': 'https://checkout.wabi.com.bo/'
          }
        }
      );

      highlight('✅ RESPUESTA DE UPDATE-PAYMENT RECIBIDA');
      console.log(JSON.stringify(paymentResponse.data, null, 2));

      // Analizar status code
      const status = paymentResponse.data.status;
      const statusCode = paymentResponse.data.status_code || paymentResponse.data.additionalData?.status_code;
      const statusDetail = paymentResponse.data.status_detail || paymentResponse.data.additionalData?.status_detail;

      highlight('📊 ANÁLISIS DE RESPUESTA');
      console.log(`
${colors.cyan}Estado del Pago:${colors.reset}
  • Status: ${status}
  • Status Code: ${statusCode}
  • Detail: ${statusDetail}
  • Payment ID: ${paymentResponse.data.paymentId}
  • Reference ID: ${paymentResponse.data.referenceId}
  • Amount: ${paymentResponse.data.amount} ${paymentResponse.data.currency}

${colors.cyan}Información de la Tarjeta:${colors.reset}
  • Brand: ${paymentResponse.data.card?.brand}
  • Last 4: ${paymentResponse.data.card?.last4}
  • Holder: ${paymentResponse.data.card?.holder_name}
      `);

      // Interpretar status code según documentación dLocal
      const statusCodeMeanings = {
        '100': '⏳ PENDING - El pago está pendiente',
        '101': '⏳ PENDING - Pendiente de autenticación 3D Secure',
        '200': '✅ PAID - El pago fue exitoso',
        '300': '❌ REJECTED - El pago fue rechazado',
        '301': '❌ REJECTED - Rechazado por el banco',
        '302': '❌ REJECTED - Monto insuficiente (Insufficient amount)',
        '303': '❌ REJECTED - Tarjeta en lista negra',
        '304': '❌ REJECTED - Validación de score',
        '305': '❌ REJECTED - Máximo de intentos alcanzado',
        '306': '❌ REJECTED - Llamar al banco para autorizar',
        '307': '❌ REJECTED - Pago duplicado',
        '308': '❌ REJECTED - Tarjeta de crédito deshabilitada',
        '309': '❌ REJECTED - Tarjeta expirada',
        '310': '❌ REJECTED - Tarjeta reportada como perdida',
        '311': '❌ REJECTED - Tarjeta solicitada por el banco',
        '312': '❌ REJECTED - Tarjeta restringida por el banco',
        '313': '❌ REJECTED - Tarjeta reportada como robada',
        '314': '❌ REJECTED - Número de tarjeta inválido',
        '315': '❌ REJECTED - Código de seguridad inválido',
        '316': '❌ REJECTED - Operación no soportada',
        '317': '❌ REJECTED - Rechazado por alto riesgo',
        '318': '❌ REJECTED - Transacción inválida',
        '319': '❌ REJECTED - Monto excedido',
        '320': '❌ REJECTED - Se requiere 3D-Secure',
        '400': '❌ CANCELLED - El pago fue cancelado',
        '600': '✅ AUTHORIZED - El pago fue autorizado',
        '700': '✅ VERIFIED - El pago fue verificado'
      };

      const meaning = statusCodeMeanings[statusCode] || '❓ Código desconocido';

      highlight('🔍 INTERPRETACIÓN DEL STATUS CODE');
      console.log(`\n  ${colors.magenta}${statusCode}${colors.reset}: ${meaning}\n`);

      // Si hay código 302, es relevante para VULN-012
      if (statusCode === '302') {
        highlight('⚠️  RELEVANTE PARA VULN-012');
        console.log(`
${colors.yellow}Este error "302 - Insufficient amount" podría indicar que:

1. ✅ El banco/dLocal SÍ está validando el monto
2. ✅ Hay validación del lado del procesador de pagos
3. ❓ Pero ¿WABI valida el monto antes de enviar a dLocal?

Para confirmar VULN-012, necesitaríamos:
- Enviar monto manipulado (ej: 1 Bs) para una orden de 10 Bs
- Ver si dLocal recibe 1 Bs o 10 Bs
- Si recibe 1 Bs → VULNERABILIDAD CONFIRMADA
- Si recibe 10 Bs → Backend de WABI valida correctamente${colors.reset}
        `);
      }

    } catch (paymentError) {
      console.error(`\n${colors.red}❌ Error en update-payment:${colors.reset}`, paymentError.message);

      if (paymentError.response) {
        highlight('📥 RESPUESTA DE ERROR DEL SERVIDOR');
        console.log(JSON.stringify(paymentError.response.data, null, 2));

        console.log(`\n${colors.cyan}Status HTTP:${colors.reset} ${paymentError.response.status}`);
        console.log(`${colors.cyan}Headers:${colors.reset}`);
        console.log(JSON.stringify(paymentError.response.headers, null, 2));
      }
    }

    console.log(`\n${colors.green}═══════════════════════════════════════════════════════════════════`);
    console.log(`✓ Test completado - Revisa las respuestas arriba`);
    console.log(`═══════════════════════════════════════════════════════════════════${colors.reset}\n`);

  } catch (error) {
    console.error(`\n${colors.red}❌ Error general:${colors.reset}`, error.message);

    if (error.response) {
      console.error('\nRespuesta del servidor:');
      console.error(JSON.stringify(error.response.data, null, 2));
    }

    process.exit(1);
  }
}

// Ejecutar test
testPaymentFlow();
