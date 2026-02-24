"""
WABI Payments SDK - Python Client

Unofficial Python SDK for integrating with WABI Digital payment gateway
"""

import requests
import json
from typing import Dict, Optional, Any


class WabiPaymentsClient:
    """WABI Payments API Client"""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize WABI Payments client

        Args:
            config: Configuration dictionary with optional keys:
                - api_url: Base API URL
                - agency_id: Agency ID
                - platform_id: Platform ID
                - dlocal_key: dLocal tokenization key
        """
        config = config or {}
        self.api_url = config.get('api_url', 'https://api.wabi.com.bo/v1')
        self.agency_id = config.get('agency_id', 2)
        self.platform_id = config.get('platform_id', 12)
        self.dlocal_key = config.get('dlocal_key', '3173e25d-501e-4189-aed1-9a7bfac64f30')
        self.dlocal_url = 'https://ppmcc.dlocal.com/cvault/credit-card/temporal'
        self.auth_token: Optional[str] = None

        # Cognito credentials
        self.cognito_credentials = {
            'username': '076f7a740acf31cf9b111d4e',
            'password': '0b194b147ef825c3d1281338',
            'user_pool': 'us-east-1_YvWkdeUGd',
            'app_client': '2eov7gcg7bfc1hb6uqj6555jtm'
        }

    def _get_browser_headers(self, include_auth: bool = False,
                            origin: str = 'https://checkout.wabi.com.bo') -> Dict[str, str]:
        """Get standard browser headers for API requests"""
        headers = {
            'accept': 'application/json',
            'content-type': 'application/json',
            'origin': origin,
            'referer': f'{origin}/',
            'sec-ch-ua': '"Chromium";v="142"',
            'sec-ch-ua-mobile': '?1',
            'sec-ch-ua-platform': '"Android"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
            'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5) AppleWebKit/537.36 '
                         '(KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36'
        }

        if include_auth and self.auth_token:
            headers['authorization'] = f'Bearer {self.auth_token}'

        return headers

    def generate_token(self) -> str:
        """
        Generate JWT authentication token

        Returns:
            JWT token string
        """
        response = requests.post(
            f'{self.api_url}/transaction/generateToken',
            json={
                'username': self.cognito_credentials['username'],
                'password': self.cognito_credentials['password']
            },
            headers=self._get_browser_headers(origin='https://checkout.wabi.com.bo')
        )
        response.raise_for_status()

        self.auth_token = response.json()['token']
        return self.auth_token

    def create_transaction(self) -> Dict[str, Any]:
        """
        Create a new transaction

        Returns:
            Transaction object with id and encrypted_id
        """
        if not self.auth_token:
            self.generate_token()

        response = requests.post(
            f'{self.api_url}/transaction/create',
            json={
                'agency_id': self.agency_id,
                'plattform_id': self.platform_id
            },
            headers=self._get_browser_headers(include_auth=True,
                                             origin='https://www.wabi.com.bo')
        )
        response.raise_for_status()
        return response.json()

    def get_transaction(self, encrypted_id: str) -> Dict[str, Any]:
        """
        Get transaction details

        Args:
            encrypted_id: Encrypted transaction ID

        Returns:
            Transaction details
        """
        response = requests.get(
            f'{self.api_url}/core/transaction/findOrderPay/{encrypted_id}',
            headers=self._get_browser_headers(origin='https://checkout.wabi.com.bo')
        )
        response.raise_for_status()
        return response.json()

    def create_order_payment(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create an order payment for a service

        Args:
            params: Dictionary with keys:
                - transaction_id: Transaction ID
                - service_code: Service code
                - amount: Payment amount in Bs
                - phone_number: Phone number for prepaid services
                - debtor_info: Dict with firstName, lastName, ciCode

        Returns:
            Order payment object
        """
        if not self.auth_token:
            self.generate_token()

        debtor = params.get('debtor_info', {})
        additional_commerce = {
            'account': params['phone_number'],
            'service': '11',
            'sub_service': params['service_code'],
            'items': [{
                'code': '0001',
                'amount': params['amount'],
                'description': 'Monto a Recargar'
            }],
            'first_name': debtor.get('first_name', ''),
            'last_name': debtor.get('last_name', ''),
            'nitFac': debtor.get('ci_code', ''),
            'nombreFac': f"{debtor.get('first_name', '')} {debtor.get('last_name', '')}",
            'typeDocument': '1'
        }

        request_body = {
            'transaction_id': params['transaction_id'],
            'description': 'Pago de Servicio Síntesis',
            'service_code': params['service_code'],
            'debtor_first_name': debtor.get('first_name', ''),
            'debtor_last_name': debtor.get('last_name', ''),
            'debtor_phone': '',
            'debtor_ci_code': debtor.get('ci_code', ''),
            'invoice_name': f"{debtor.get('first_name', '')} {debtor.get('last_name', '')}",
            'invoice_type': '1',
            'invoice_document_number': debtor.get('ci_code', ''),
            'additional_data': '{}',
            'additional_commerce': json.dumps(additional_commerce),
            'is_billable': 1,
            'amount': {
                'currency': 'Bs',
                'value': f"{params['amount']:.2f}"
            },
            'items': [{
                'description': 'Monto a Recargar',
                'unit_price': f"{params['amount']:.2f}",
                'quantity': '1',
                'discount': '0.00',
                'detail_type': '1'
            }]
        }

        response = requests.post(
            f'{self.api_url}/core/order-payment/create',
            json=request_body,
            headers=self._get_browser_headers(include_auth=True,
                                             origin='https://www.wabi.com.bo')
        )
        response.raise_for_status()
        return response.json()

    def update_customer_payer(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update customer payer information

        Args:
            params: Dictionary with transaction_id, first_name, last_name, email, phone

        Returns:
            Updated customer object
        """
        response = requests.put(
            f'{self.api_url}/core/customer-payer/update',
            json={
                'customer_payer': {
                    'transaction_id': params['transaction_id'],
                    'first_name': params['first_name'],
                    'last_name': params['last_name'],
                    'email': params['email'],
                    'phone': params['phone'],
                    'document': {
                        'document_type': '',
                        'business_name': '',
                        'document_number': ''
                    }
                }
            },
            headers=self._get_browser_headers(origin='https://checkout.wabi.com.bo')
        )
        response.raise_for_status()
        return response.json()

    def tokenize_card(self, card_data: Dict[str, str]) -> str:
        """
        Tokenize credit card using dLocal

        Args:
            card_data: Dictionary with pan, cvv, expiration_month,
                      expiration_year, holder_name

        Returns:
            Card token (CV-xxxx)
        """
        response = requests.post(
            self.dlocal_url,
            json={
                'pan': card_data['pan'],
                'cvv': card_data['cvv'],
                'expiration_month': card_data['expiration_month'],
                'expiration_year': card_data['expiration_year'],
                'holder_name': card_data['holder_name'],
                'key': self.dlocal_key,
                'country_code': 'BO'
            },
            headers={
                'accept': 'application/json',
                'content-type': 'application/json',
                'origin': 'https://checkout.wabi.com.bo',
                'referer': 'https://checkout.wabi.com.bo/'
            }
        )
        response.raise_for_status()
        return response.json()['token']

    def process_payment(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process payment with tokenized card

        Args:
            params: Dictionary with transaction_id, transaction_id_encrypted,
                   payment_id, amount, card_token, cardholder_name

        Returns:
            Payment result
        """
        if not self.auth_token:
            self.generate_token()

        response = requests.post(
            f'{self.api_url}/payment/card-payment/update-payment',
            json={
                'transaction_id': int(params['transaction_id']),
                'transaction_id_encrypted': params['transaction_id_encrypted'],
                'payment_id': params['payment_id'],
                'amount': {
                    'currency': 'Bs.',
                    'value': params['amount']
                },
                'token': params['card_token'],
                'titular_name': params['cardholder_name'],
                'payment_method': {
                    'type': 'CARD_PAYMENT'
                }
            },
            headers=self._get_browser_headers(include_auth=True,
                                             origin='https://checkout.wabi.com.bo')
        )
        response.raise_for_status()
        return response.json()

    def complete_payment(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Complete payment flow (convenience method)

        Args:
            params: Dictionary with service_code, amount, phone_number,
                   debtor_info, card_data, customer_info (optional)

        Returns:
            Complete payment result with all intermediate data
        """
        print('Creating transaction...')
        transaction = self.create_transaction()
        print(f'Transaction created: {transaction["id"]}')

        print('Creating order payment...')
        order = self.create_order_payment({
            'transaction_id': transaction['id'],
            'service_code': params['service_code'],
            'amount': params['amount'],
            'phone_number': params['phone_number'],
            'debtor_info': params['debtor_info']
        })
        print(f'Order created: {order["id"]}')

        if params.get('customer_info'):
            print('Updating customer information...')
            self.update_customer_payer({
                'transaction_id': transaction['id'],
                **params['customer_info']
            })

        print('Tokenizing card...')
        card_token = self.tokenize_card(params['card_data'])
        print(f'Card tokenized: {card_token}')

        print('Processing payment...')
        payment = self.process_payment({
            'transaction_id': transaction['id'],
            'transaction_id_encrypted': transaction['transaction_id_encrypted'],
            'payment_id': order['id'],
            'amount': params['amount'],
            'card_token': card_token,
            'cardholder_name': params['card_data']['holder_name']
        })

        return {
            'transaction': transaction,
            'order': order,
            'card_token': card_token,
            'payment': payment,
            'checkout_url': transaction['url_redirect_checkout']
        }


# Example usage
if __name__ == '__main__':
    client = WabiPaymentsClient()

    # Example: Create transaction
    transaction = client.create_transaction()
    print(f"Transaction ID: {transaction['id']}")
    print(f"Checkout URL: {transaction['url_redirect_checkout']}")
