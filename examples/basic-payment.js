/**
 * WABI Payments SDK - Basic Payment Example
 *
 * This example demonstrates the complete payment flow:
 * 1. Create a transaction
 * 2. Add a service order (Tigo Prepaid)
 * 3. Tokenize a credit card
 * 4. Process the payment
 */

const WabiPaymentsClient = require('../src/wabi-client');

async function runBasicPaymentExample() {
  // Initialize the client
  const client = new WabiPaymentsClient({
    apiUrl: 'https://api.wabi.com.bo/v1',
    agencyId: 2,
    platformId: 12
  });

  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  WABI Payments SDK - Basic Payment Example');
    console.log('═══════════════════════════════════════════════════════\n');

    // Step 1: Generate authentication token
    console.log('Step 1: Generating authentication token...');
    const token = await client.generateToken();
    console.log(`✓ Token generated: ${token.substring(0, 50)}...\n`);

    // Step 2: Create a new transaction
    console.log('Step 2: Creating new transaction...');
    const transaction = await client.createTransaction();
    console.log(`✓ Transaction ID: ${transaction.id}`);
    console.log(`  Encrypted ID: ${transaction.transaction_id_encrypted}`);
    console.log(`  Checkout URL: ${transaction.url_redirect_checkout}\n`);

    // Step 3: Create order payment for Tigo Prepaid service
    console.log('Step 3: Creating order payment (Tigo Prepaid 10 Bs)...');
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
    console.log(`✓ Order Payment ID: ${order.id}`);
    console.log(`  Amount: ${order.amount.value} ${order.amount.currency}`);
    console.log(`  Status: ${order.payment_status}\n`);

    // Step 4: Update customer payer information (optional)
    console.log('Step 4: Updating customer information...');
    await client.updateCustomerPayer({
      transactionId: transaction.id,
      firstName: 'Juan',
      lastName: 'Perez',
      email: 'juan.perez@example.com',
      phone: '69320910'
    });
    console.log(`✓ Customer information updated\n`);

    // Step 5: Tokenize credit card
    console.log('Step 5: Tokenizing credit card...');
    const cardToken = await client.tokenizeCard({
      pan: '4111111111111111',
      cvv: '123',
      expirationMonth: '12',
      expirationYear: '2025',
      holderName: 'Juan Perez'
    });
    console.log(`✓ Card tokenized: ${cardToken}\n`);

    // Step 6: Process payment
    console.log('Step 6: Processing payment...');
    const payment = await client.processPayment({
      transactionId: transaction.id,
      transactionIdEncrypted: transaction.transaction_id_encrypted,
      paymentId: order.id,
      amount: 10,
      cardToken: cardToken,
      cardholderName: 'Juan Perez'
    });

    console.log('═══════════════════════════════════════════════════════');
    console.log('  Payment Result');
    console.log('═══════════════════════════════════════════════════════');
    console.log(JSON.stringify(payment, null, 2));
    console.log('═══════════════════════════════════════════════════════\n');

    // Step 7: Get final transaction status
    console.log('Step 7: Checking final transaction status...');
    const finalTransaction = await client.getTransaction(transaction.transaction_id_encrypted);
    console.log(`Transaction Status: ${finalTransaction.order_payments[0].payment_status}`);
    console.log(`Payment Amount: ${finalTransaction.amount.value} ${finalTransaction.amount.currency}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
  }
}

// Run the example
if (require.main === module) {
  runBasicPaymentExample()
    .then(() => {
      console.log('\n✓ Example completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Example failed:', error);
      process.exit(1);
    });
}

module.exports = runBasicPaymentExample;
