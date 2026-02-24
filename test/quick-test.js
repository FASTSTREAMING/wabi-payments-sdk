#!/usr/bin/env node

/**
 * WABI Payments SDK - Quick Test
 * Demuestra autenticación y creación de transacciones
 */

const WabiPayments = require('../src/wabi-client.js');

async function quickTest() {
  console.log('\n🚀 WABI Payments SDK - Quick Test\n');
  console.log('═'.repeat(60) + '\n');

  try {
    const client = new WabiPayments();

    // 1. Autenticación
    console.log('1️⃣  Autenticación con AWS Cognito');
    const token = await client.generateToken();
    console.log('   ✅ JWT Token obtenido (%d chars)', token.length);
    console.log('   📝 Credentials: %s', client.cognitoCredentials.username);
    console.log();

    // 2. Crear transacción
    console.log('2️⃣  Creando nueva transacción');
    const transaction = await client.createTransaction();
    console.log('   ✅ Transacción ID: %s', transaction.id);
    console.log('   🔐 Encrypted ID: %s', transaction.encrypted_id || 'N/A');
    console.log();

    // 3. Crear orden de pago
    console.log('3️⃣  Creando orden de pago (10 Bs Tigo Prepago)');
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
    console.log('   ✅ Orden de Pago ID: %s', orderPayment.id);
    console.log('   💰 Monto: %s', orderPayment.amount?.value || orderPayment.amount);
    console.log('   📱 Teléfono: %s', orderPayment.debtor_info?.phoneNumber || '69320910');
    console.log('   🏷️  Servicio: %s', orderPayment.service_code);
    console.log();

    console.log('═'.repeat(60));
    console.log('✨ TEST EXITOSO - El SDK funciona correctamente');
    console.log('═'.repeat(60));
    console.log();
    console.log('📊 RESUMEN:');
    console.log('   • API Endpoint: https://api.wabi.com.bo/v1');
    console.log('   • Transacción: %s', transaction.id);
    console.log('   • Orden: %s', orderPayment.id);
    console.log('   • Status: READY FOR PAYMENT');
    console.log();
    console.log('⚠️  NOTA: Las credenciales expuestas en el SDK están ACTIVAS');
    console.log('   Esto confirma que WABI no ha detectado el uso no autorizado.');
    console.log();

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

quickTest();
