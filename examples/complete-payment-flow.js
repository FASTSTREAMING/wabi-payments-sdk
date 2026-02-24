/**
 * Complete Payment Flow - One-call Example
 *
 * This example uses the convenience method to handle the entire payment flow
 * in a single call.
 */

const WabiPaymentsClient = require('../src/wabi-client');

async function completePaymentFlow() {
  const client = new WabiPaymentsClient();

  try {
    console.log('Starting complete payment flow...\n');

    const result = await client.completePayment({
      // Service configuration
      serviceCode: 'SINTESIS_TELECEL_PREPAGO',
      amount: 10.00,
      phoneNumber: '69320910',

      // Debtor information
      debtorInfo: {
        firstName: 'Maria',
        lastName: 'Garcia',
        ciCode: '87654321'
      },

      // Customer information
      customerInfo: {
        firstName: 'Maria',
        lastName: 'Garcia',
        email: 'maria.garcia@example.com',
        phone: '69320910'
      },

      // Card data
      cardData: {
        pan: '4111111111111111',
        cvv: '456',
        expirationMonth: '06',
        expirationYear: '2026',
        holderName: 'Maria Garcia'
      }
    });

    console.log('\n══════════════════════════════════════════════════');
    console.log('  Payment Flow Completed Successfully');
    console.log('══════════════════════════════════════════════════\n');

    console.log('Transaction Details:');
    console.log(`  ID: ${result.transaction.id}`);
    console.log(`  Encrypted ID: ${result.transaction.transaction_id_encrypted}`);
    console.log(`  Checkout URL: ${result.checkoutUrl}\n`);

    console.log('Order Details:');
    console.log(`  Order ID: ${result.order.id}`);
    console.log(`  Service: ${result.order.service_name}`);
    console.log(`  Amount: ${result.order.amount.value} ${result.order.amount.currency}`);
    console.log(`  Status: ${result.order.payment_status}\n`);

    console.log('Payment Details:');
    console.log(`  Card Token: ${result.cardToken}`);
    console.log(`  Payment Response:`, result.payment);

    console.log('\n══════════════════════════════════════════════════\n');

    return result;

  } catch (error) {
    console.error('Payment flow failed:', error.message);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  completePaymentFlow()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = completePaymentFlow;
