/**
 * WABI Payments SDK - Main Client
 *
 * Unofficial SDK for integrating with WABI Digital payment gateway
 * @version 1.0.0
 */

const axios = require('axios');

class WabiPaymentsClient {
  /**
   * Initialize WABI Payments client
   * @param {Object} config - Configuration options
   * @param {string} config.apiUrl - Base API URL (default: https://api.wabi.com.bo/v1)
   * @param {number} config.agencyId - Agency ID (default: 2)
   * @param {number} config.platformId - Platform ID (default: 12)
   * @param {string} config.dlocalKey - dLocal tokenization key
   */
  constructor(config = {}) {
    this.apiUrl = config.apiUrl || 'https://api.wabi.com.bo/v1';
    this.agencyId = config.agencyId || 2;
    this.platformId = config.platformId || 12;
    this.dlocalKey = config.dlocalKey || '3173e25d-501e-4189-aed1-9a7bfac64f30';
    this.dlocalUrl = 'https://ppmcc.dlocal.com/cvault/credit-card/temporal';
    this.authToken = null;

    // Cognito credentials
    this.cognitoCredentials = {
      username: '076f7a740acf31cf9b111d4e',
      password: '0b194b147ef825c3d1281338',
      userPool: 'us-east-1_YvWkdeUGd',
      appClient: '2eov7gcg7bfc1hb6uqj6555jtm'
    };
  }

  /**
   * Get standard browser headers for API requests
   * @private
   */
  _getBrowserHeaders(includeAuth = false, origin = 'https://checkout.wabi.com.bo') {
    const headers = {
      'accept': 'application/json',
      'content-type': 'application/json',
      'origin': origin,
      'referer': `${origin}/`,
      'sec-ch-ua': '"Chromium";v="142"',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"Android"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36'
    };

    if (includeAuth && this.authToken) {
      headers['authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Generate JWT authentication token
   * @returns {Promise<string>} JWT token
   */
  async generateToken() {
    try {
      const response = await axios.post(
        `${this.apiUrl}/transaction/generateToken`,
        {
          username: this.cognitoCredentials.username,
          password: this.cognitoCredentials.password
        },
        {
          headers: this._getBrowserHeaders(false, 'https://checkout.wabi.com.bo')
        }
      );

      this.authToken = response.data.token;
      return this.authToken;
    } catch (error) {
      throw new Error(`Token generation failed: ${error.message}`);
    }
  }

  /**
   * Create a new transaction
   * @returns {Promise<Object>} Transaction object with id and encrypted_id
   */
  async createTransaction() {
    try {
      // Ensure we have a valid token
      if (!this.authToken) {
        await this.generateToken();
      }

      const response = await axios.post(
        `${this.apiUrl}/transaction/create`,
        {
          agency_id: this.agencyId,
          plattform_id: this.platformId
        },
        {
          headers: this._getBrowserHeaders(true, 'https://www.wabi.com.bo')
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`Transaction creation failed: ${error.message}`);
    }
  }

  /**
   * Get transaction details
   * @param {string} encryptedId - Encrypted transaction ID
   * @returns {Promise<Object>} Transaction details
   */
  async getTransaction(encryptedId) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/core/transaction/findOrderPay/${encryptedId}`,
        {
          headers: this._getBrowserHeaders(false, 'https://checkout.wabi.com.bo')
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`Get transaction failed: ${error.message}`);
    }
  }

  /**
   * Create an order payment for a service
   * @param {Object} params - Order payment parameters
   * @param {string} params.transactionId - Transaction ID
   * @param {string} params.serviceCode - Service code (e.g., SINTESIS_TELECEL_PREPAGO)
   * @param {number} params.amount - Payment amount in Bs
   * @param {string} params.phoneNumber - Phone number for prepaid services
   * @param {Object} params.debtorInfo - Debtor information
   * @returns {Promise<Object>} Order payment object
   */
  async createOrderPayment(params) {
    try {
      if (!this.authToken) {
        await this.generateToken();
      }

      const additionalCommerce = {
        account: params.phoneNumber,
        service: '11',
        sub_service: params.serviceCode,
        items: [{
          code: '0001',
          amount: params.amount,
          description: 'Monto a Recargar'
        }],
        first_name: params.debtorInfo.firstName || '',
        last_name: params.debtorInfo.lastName || '',
        nitFac: params.debtorInfo.ciCode || '',
        nombreFac: `${params.debtorInfo.firstName || ''} ${params.debtorInfo.lastName || ''}`,
        typeDocument: '1'
      };

      const requestBody = {
        transaction_id: params.transactionId,
        description: 'Pago de Servicio Síntesis',
        service_code: params.serviceCode,
        debtor_first_name: params.debtorInfo.firstName || '',
        debtor_last_name: params.debtorInfo.lastName || '',
        debtor_phone: '',
        debtor_ci_code: params.debtorInfo.ciCode || '',
        invoice_name: `${params.debtorInfo.firstName || ''} ${params.debtorInfo.lastName || ''}`,
        invoice_type: '1',
        invoice_document_number: params.debtorInfo.ciCode || '',
        additional_data: '{}',
        additional_commerce: JSON.stringify(additionalCommerce),
        is_billable: 1,
        amount: {
          currency: 'Bs',
          value: params.amount.toFixed(2)
        },
        items: [{
          description: 'Monto a Recargar',
          unit_price: params.amount.toFixed(2),
          quantity: '1',
          discount: '0.00',
          detail_type: '1'
        }]
      };

      const response = await axios.post(
        `${this.apiUrl}/core/order-payment/create`,
        requestBody,
        {
          headers: this._getBrowserHeaders(true, 'https://www.wabi.com.bo')
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`Order payment creation failed: ${error.message}`);
    }
  }

  /**
   * Update customer payer information
   * @param {Object} params - Customer parameters
   * @param {string} params.transactionId - Transaction ID
   * @param {string} params.firstName - First name
   * @param {string} params.lastName - Last name
   * @param {string} params.email - Email address
   * @param {string} params.phone - Phone number
   * @returns {Promise<Object>} Updated customer object
   */
  async updateCustomerPayer(params) {
    try {
      const response = await axios.put(
        `${this.apiUrl}/core/customer-payer/update`,
        {
          customer_payer: {
            transaction_id: params.transactionId,
            first_name: params.firstName,
            last_name: params.lastName,
            email: params.email,
            phone: params.phone,
            document: {
              document_type: '',
              business_name: '',
              document_number: ''
            }
          }
        },
        {
          headers: this._getBrowserHeaders(false, 'https://checkout.wabi.com.bo')
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`Customer payer update failed: ${error.message}`);
    }
  }

  /**
   * Tokenize credit card using dLocal
   * @param {Object} cardData - Card information
   * @param {string} cardData.pan - Card number
   * @param {string} cardData.cvv - CVV code
   * @param {string} cardData.expirationMonth - Expiration month (MM)
   * @param {string} cardData.expirationYear - Expiration year (YYYY)
   * @param {string} cardData.holderName - Cardholder name
   * @returns {Promise<string>} Card token (CV-xxxx)
   */
  async tokenizeCard(cardData) {
    try {
      const response = await axios.post(
        this.dlocalUrl,
        {
          pan: cardData.pan,
          cvv: cardData.cvv,
          expiration_month: cardData.expirationMonth,
          expiration_year: cardData.expirationYear,
          holder_name: cardData.holderName,
          key: this.dlocalKey,
          country_code: 'BO'
        },
        {
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'origin': 'https://checkout.wabi.com.bo',
            'referer': 'https://checkout.wabi.com.bo/',
            'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5) AppleWebKit/537.36'
          }
        }
      );

      return response.data.token;
    } catch (error) {
      throw new Error(`Card tokenization failed: ${error.message}`);
    }
  }

  /**
   * Process payment with tokenized card
   * @param {Object} params - Payment parameters
   * @param {number|string} params.transactionId - Transaction ID
   * @param {string} params.transactionIdEncrypted - Encrypted transaction ID
   * @param {string} params.paymentId - Order payment ID
   * @param {number} params.amount - Payment amount in Bs
   * @param {string} params.cardToken - Card token from dLocal
   * @param {string} params.cardholderName - Cardholder name
   * @returns {Promise<Object>} Payment result
   */
  async processPayment(params) {
    try {
      if (!this.authToken) {
        await this.generateToken();
      }

      const response = await axios.post(
        `${this.apiUrl}/payment/card-payment/update-payment`,
        {
          transaction_id: parseInt(params.transactionId),
          transaction_id_encrypted: params.transactionIdEncrypted,
          payment_id: params.paymentId,
          amount: {
            currency: 'Bs.',
            value: params.amount
          },
          token: params.cardToken,
          titular_name: params.cardholderName,
          payment_method: {
            type: 'CARD_PAYMENT'
          }
        },
        {
          headers: this._getBrowserHeaders(true, 'https://checkout.wabi.com.bo')
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`Payment processing failed: ${error.message}`);
    }
  }

  /**
   * Complete payment flow (convenience method)
   * @param {Object} params - Complete payment parameters
   * @param {string} params.serviceCode - Service code
   * @param {number} params.amount - Amount in Bs
   * @param {string} params.phoneNumber - Phone number
   * @param {Object} params.debtorInfo - Debtor information
   * @param {Object} params.cardData - Card data
   * @param {Object} params.customerInfo - Customer information
   * @returns {Promise<Object>} Complete payment result with all intermediate data
   */
  async completePayment(params) {
    try {
      // Step 1: Create transaction
      console.log('Creating transaction...');
      const transaction = await this.createTransaction();
      console.log(`Transaction created: ${transaction.id}`);

      // Step 2: Create order payment
      console.log('Creating order payment...');
      const order = await this.createOrderPayment({
        transactionId: transaction.id,
        serviceCode: params.serviceCode,
        amount: params.amount,
        phoneNumber: params.phoneNumber,
        debtorInfo: params.debtorInfo
      });
      console.log(`Order created: ${order.id}`);

      // Step 3: Update customer (optional)
      if (params.customerInfo) {
        console.log('Updating customer information...');
        await this.updateCustomerPayer({
          transactionId: transaction.id,
          ...params.customerInfo
        });
      }

      // Step 4: Tokenize card
      console.log('Tokenizing card...');
      const cardToken = await this.tokenizeCard(params.cardData);
      console.log(`Card tokenized: ${cardToken}`);

      // Step 5: Process payment
      console.log('Processing payment...');
      const payment = await this.processPayment({
        transactionId: transaction.id,
        transactionIdEncrypted: transaction.transaction_id_encrypted,
        paymentId: order.id,
        amount: params.amount,
        cardToken: cardToken,
        cardholderName: params.cardData.holderName
      });

      return {
        transaction,
        order,
        cardToken,
        payment,
        checkoutUrl: transaction.url_redirect_checkout
      };
    } catch (error) {
      throw new Error(`Complete payment failed: ${error.message}`);
    }
  }

  /**
   * Get list of available services
   * @returns {Promise<Array>} List of services
   */
  async getServices() {
    try {
      const response = await axios.get(
        `${this.apiUrl}/core/service/find-all-service-commerce`,
        {
          params: {
            customerId: '',
            agency_id: this.agencyId,
            plattform_id: this.platformId
          },
          headers: this._getBrowserHeaders(false, 'https://www.wabi.com.bo')
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`Get services failed: ${error.message}`);
    }
  }

  /**
   * Confirm transaction
   * @param {number|string} transactionId - Transaction ID
   * @returns {Promise<Object>} Confirmation result
   */
  async confirmTransaction(transactionId) {
    try {
      if (!this.authToken) {
        await this.generateToken();
      }

      const response = await axios.post(
        `${this.apiUrl}/core/transaction/confirm-transaction`,
        {
          transaction_id: parseInt(transactionId)
        },
        {
          headers: this._getBrowserHeaders(true, 'https://www.wabi.com.bo')
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`Transaction confirmation failed: ${error.message}`);
    }
  }
}

module.exports = WabiPaymentsClient;
