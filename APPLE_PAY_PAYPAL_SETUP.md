# Apple Pay Integration with PayPal

This guide explains how to enable Apple Pay as a payment option through PayPal Checkout.

## Overview

Apple Pay can be enabled as an alternative payment method in PayPal Checkout. When enabled, customers using supported Apple devices (iPhone, iPad, Mac with Safari) will see the Apple Pay button alongside the standard PayPal button.

## Backend Configuration

The backend has been updated to support Apple Pay. The PayPal order creation in `src/services/paypal.service.ts` is configured to work with alternative payment methods.

**Important:** The backend doesn't need special configuration - Apple Pay is automatically available if your PayPal account is eligible.

## Frontend Configuration

To enable Apple Pay in your frontend PayPal integration, you need to configure the PayPal SDK properly.

### 1. PayPal Buttons Configuration

When initializing PayPal Buttons, ensure you're using the latest PayPal SDK and configure it to show alternative payment methods:

```javascript
// Example: React/Next.js
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';

<PayPalScriptProvider 
  options={{ 
    clientId: "YOUR_PAYPAL_CLIENT_ID",
    currency: "GBP",
    // Enable alternative payment methods
    enableFunding: "applepay", // This enables Apple Pay
    // Or enable multiple alternative payment methods:
    // enableFunding: "applepay,venmo,paylater"
  }}
>
  <PayPalButtons
    createOrder={async () => {
      // Call your backend endpoint
      const response = await fetch('/api/v1/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: orderAmount,
          orderId: orderId,
        }),
      });
      const data = await response.json();
      return data.data.orderID; // Return PayPal order ID
    }}
    onApprove={async (data, actions) => {
      // Capture the payment
      const response = await fetch('/api/v1/payments/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderID: data.orderID,
          orderId: orderId,
        }),
      });
      const result = await response.json();
      if (result.success) {
        // Handle successful payment
        window.location.href = '/payment/success';
      }
    }}
    onError={(err) => {
      console.error('PayPal error:', err);
      // Handle error
    }}
  />
</PayPalScriptProvider>
```

### 2. HTML/JavaScript Configuration

If you're using the PayPal JavaScript SDK directly:

```html
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&currency=GBP&enable-funding=applepay"></script>

<div id="paypal-button-container"></div>

<script>
  paypal.Buttons({
    createOrder: function(data, actions) {
      return fetch('/api/v1/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: orderAmount,
          orderId: orderId,
        }),
      })
      .then(response => response.json())
      .then(data => data.data.orderID);
    },
    onApprove: function(data, actions) {
      return fetch('/api/v1/payments/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderID: data.orderID,
          orderId: orderId,
        }),
      })
      .then(response => response.json())
      .then(function(details) {
        if (details.success) {
          window.location.href = '/payment/success';
        }
      });
    },
    onError: function(err) {
      console.error('PayPal error:', err);
    }
  }).render('#paypal-button-container');
</script>
```

### 3. Key Configuration Parameters

- **`enable-funding=applepay`**: This URL parameter enables Apple Pay in the PayPal SDK
- **Currency**: Ensure your currency (GBP) is supported by Apple Pay
- **HTTPS**: Apple Pay requires HTTPS in production (localhost is fine for development)

## PayPal Account Requirements

For Apple Pay to appear in your PayPal Checkout:

1. **Business Account**: You need a PayPal Business account (not Personal)
2. **Account Approval**: Your PayPal business account must be approved for alternative payment methods
3. **Account Verification**: Complete all required business verification steps
4. **Contact PayPal Support**: If Apple Pay doesn't appear, contact PayPal Business Support to:
   - Request Apple Pay enablement
   - Verify your account is eligible
   - Check if there are any restrictions

## Testing Apple Pay

### Sandbox Testing

1. Use PayPal Sandbox mode for testing
2. Apple Pay may not appear in sandbox - this is normal
3. Test the standard PayPal flow to ensure everything works

### Production Testing

1. Switch to PayPal Live mode
2. Ensure your account is approved for Apple Pay
3. Test on actual Apple devices (iPhone/iPad/Mac with Safari)
4. Apple Pay button will appear automatically if:
   - Account is eligible
   - User is on supported device
   - User has Apple Pay set up

## Device/Browser Support

Apple Pay through PayPal is available on:
- **iOS**: Safari on iPhone/iPad
- **macOS**: Safari on Mac
- **Not available**: Chrome, Firefox, or other browsers (even on Apple devices)

## Troubleshooting

### Apple Pay Button Not Appearing

1. **Check Account Eligibility**
   - Log into PayPal Business Dashboard
   - Contact PayPal Support to verify Apple Pay is enabled
   - Check for any account restrictions

2. **Check Frontend Configuration**
   - Verify `enable-funding=applepay` is in the SDK script URL
   - Ensure you're using the latest PayPal SDK version
   - Check browser console for errors

3. **Check Device/Browser**
   - Must be Safari on iOS/macOS
   - User must have Apple Pay configured
   - Device must support Apple Pay

4. **Check Currency**
   - Verify GBP is supported (it is)
   - Some currencies may not support Apple Pay

### Testing in Development

- Apple Pay may not work in localhost/development
- Use PayPal Sandbox for testing the payment flow
- Test Apple Pay in production/staging environment

## Additional Resources

- [PayPal Developer Documentation - Alternative Payment Methods](https://developer.paypal.com/docs/checkout/apm/)
- [PayPal Buttons Integration Guide](https://developer.paypal.com/docs/checkout/)
- [Apple Pay with PayPal](https://developer.paypal.com/docs/checkout/apm/apple-pay/)

## Notes

- Apple Pay transactions are processed through PayPal, so your existing webhook handlers will work
- Payment capture flow remains the same
- No additional backend changes needed once account is approved
- Apple Pay availability is determined by PayPal based on account status and user device

