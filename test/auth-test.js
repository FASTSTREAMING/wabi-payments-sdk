#!/usr/bin/env node

/**
 * WABI Payments SDK - Authentication Test
 * Prueba simple de autenticación con Cognito
 */

const WabiPayments = require('../src/wabi-client.js');

async function testAuth() {
  console.log('🔐 Testing WABI Payments Authentication...\n');

  try {
    const client = new WabiPayments();

    console.log('📡 Credentials:');
    console.log(`   Username: ${client.cognitoCredentials.username}`);
    console.log(`   User Pool: ${client.cognitoCredentials.userPool}`);
    console.log(`   App Client: ${client.cognitoCredentials.appClient}\n`);

    console.log('⏳ Generating JWT token...');
    const token = await client.generateToken();

    console.log('\n✅ Authentication successful!');
    console.log(`\nJWT Token (first 100 chars):`);
    console.log(token.substring(0, 100) + '...');
    console.log(`\nToken length: ${token.length} characters`);

    // Decodificar header del JWT
    const parts = token.split('.');
    if (parts.length === 3) {
      const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

      console.log('\n📋 Token Info:');
      console.log(`   Algorithm: ${header.alg}`);
      console.log(`   Type: ${header.typ}`);
      console.log(`   Username: ${payload.username || 'N/A'}`);
      console.log(`   Issued At: ${new Date(payload.iat * 1000).toISOString()}`);
      console.log(`   Expires At: ${new Date(payload.exp * 1000).toISOString()}`);
    }

    console.log('\n✨ SDK is working correctly!\n');

  } catch (error) {
    console.error('\n❌ Authentication failed:');
    console.error(error.message);

    if (error.response) {
      console.error('\nServer response:');
      console.error(JSON.stringify(error.response.data, null, 2));
    }

    process.exit(1);
  }
}

testAuth();
