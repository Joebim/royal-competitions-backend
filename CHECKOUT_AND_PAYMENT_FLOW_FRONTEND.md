# Checkout and Payment Flow - Frontend Endpoints

This document provides all endpoints and implementation details for the checkout page and payment processing flow.

**Base URL:** `/api/v1`

## ⚠️ IMPORTANT: Correct Flow

**You MUST follow this order:**

1. **Reserve tickets** → `POST /competitions/:id/hold`
2. **Create order** → `POST /orders` (with billing details and reserved tickets)
3. **Get payment intent** → Use `clientSecret` from order creation OR `POST /checkout/payment-intent` (with orderId)
4. **Process payment** → Use Stripe.js with the `clientSecret`
5. **Confirm order** → `POST /checkout/confirm`

**❌ DO NOT:** Call `POST /checkout/payment-intent` without first creating an order. The `orderId` is required.

---

## Complete Checkout Flow

### Flow Overview

1. User reserves tickets → `POST /competitions/:id/hold`
2. User adds to cart → `POST /cart/items`
3. User views cart → `GET /cart`
4. User proceeds to checkout page
5. User fills billing/shipping details
6. **Create order** → `POST /orders` (creates order with billing details and reserved tickets)
7. **Get payment intent** → `POST /checkout/payment-intent` (with orderId) OR payment intent is returned from order creation
8. Process payment with Stripe.js (frontend)
9. Confirm order → `POST /checkout/confirm`
10. Webhook automatically completes order (backend)

---

## 1. Checkout Page Endpoints

### Get Cart (Before Checkout)

Get the user's cart to display on checkout page.

**Endpoint:** `GET /cart`

**Authentication:** Required (Bearer token)

**Response:**

```json
{
  "success": true,
  "message": "Cart retrieved successfully",
  "data": {
    "id": "cart_id",
    "currency": "GBP",
    "items": [
      {
        "id": "item_id",
        "competitionId": "competition_id",
        "quantity": 5,
        "unitPrice": 5.0,
        "subtotal": 25.0,
        "competition": {
          "id": "competition_id",
          "title": "Competition Title",
          "image": "https://image-url.com/image.jpg",
          "ticketPrice": "5.00"
        }
      }
    ],
    "totals": {
      "subtotal": 25.0,
      "total": 25.0,
      "itemCount": 1
    }
  }
}
```

**Usage:** Call this on checkout page load to display cart items and calculate totals.

---

### Create Order

Create an order with billing details and reserved tickets. This must be done before creating a payment intent.

**Endpoint:** `POST /orders`

**Authentication:** Optional (can be guest checkout)

**Request Body:**

```json
{
  "competitionId": "competition_id",
  "qty": 5,
  "ticketsReserved": [1001, 1002, 1003, 1004, 1005],
  "billingDetails": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+44123456789"
  },
  "shippingAddress": {
    "line1": "123 Main Street",
    "line2": "Apt 4B",
    "city": "London",
    "postalCode": "SW1A 1AA",
    "country": "GB"
  },
  "marketingOptIn": false
}
```

**Required Fields:**

- `competitionId` - Competition ID
- `qty` - Number of tickets
- `ticketsReserved` - Array of reserved ticket numbers (from ticket reservation)
- `billingDetails.email` - Email is required in billing details

**Response:**

```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order": {
      "id": "order_id",
      "competitionId": "competition_id",
      "amountPence": 2500,
      "amountGBP": "25.00",
      "quantity": 5,
      "status": "pending",
      "paymentStatus": "pending",
      "ticketsReserved": [1001, 1002, 1003, 1004, 1005],
      "billingDetails": {...},
      "shippingAddress": {...}
    },
    "clientSecret": "pi_xxx_secret_xxx"
  }
}
```

**Error Responses:**

- `400` - Missing required fields, competition not found, reserved tickets no longer available
- `404` - Competition not found

**Frontend Implementation:**

```javascript
// Example: Create order
const createOrder = async (
  competitionId,
  quantity,
  reservedTickets,
  formData
) => {
  const response = await fetch('/api/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`, // Optional for guest checkout
    },
    body: JSON.stringify({
      competitionId,
      qty: quantity,
      ticketsReserved: reservedTickets,
      billingDetails: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
      },
      shippingAddress: {
        line1: formData.addressLine1,
        line2: formData.addressLine2,
        city: formData.city,
        postalCode: formData.postalCode,
        country: formData.country || 'GB',
      },
      marketingOptIn: formData.marketingOptIn || false,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const data = await response.json();
  return {
    orderId: data.data.order.id,
    clientSecret: data.data.clientSecret,
  };
};
```

---

### Create Payment Intent for Existing Order

Create or get payment intent for an existing order. Use this if you need to update billing details or get a new payment intent.

**Endpoint:** `POST /checkout/payment-intent`

**Authentication:** Required (Bearer token)

**Request Body:**

```json
{
  "orderId": "order_id",
  "billingDetails": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+44123456789"
  },
  "shippingAddress": {
    "line1": "123 Main Street",
    "line2": "Apt 4B",
    "city": "London",
    "postalCode": "SW1A 1AA",
    "country": "GB"
  },
  "marketingOptIn": false
}
```

**Required Fields:**

- `orderId` - Order ID (required)
- `billingDetails.email` - Email is required

**Response:**

```json
{
  "success": true,
  "message": "Payment intent created",
  "data": {
    "order": {
      "id": "order_id",
      "competitionId": "competition_id",
      "amountPence": 2500,
      "amountGBP": "25.00",
      "quantity": 5,
      "ticketsReserved": [1001, 1002, 1003, 1004, 1005]
    },
    "payment": {
      "clientSecret": "pi_xxx_secret_xxx",
      "amount": 2500,
      "currency": "GBP"
    }
  }
}
```

**Error Responses:**

- `400` - Order ID required, tickets not reserved, competition not available, or missing billing details
- `404` - Order not found
- `403` - Not authorized to access this order

**Frontend Implementation:**

```javascript
// Example: Create payment intent for existing order
const createPaymentIntent = async (orderId, formData) => {
  const response = await fetch('/api/v1/checkout/payment-intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      orderId: orderId, // REQUIRED
      billingDetails: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
      },
      shippingAddress: {
        line1: formData.addressLine1,
        line2: formData.addressLine2,
        city: formData.city,
        postalCode: formData.postalCode,
        country: formData.country || 'GB',
      },
      marketingOptIn: formData.marketingOptIn || false,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const data = await response.json();
  return data.data.payment.clientSecret;
};
```

---

### Confirm Checkout Order

Verify order status after payment processing. Use this to check if payment was successful.

**Endpoint:** `POST /checkout/confirm`

**Authentication:** Required (Bearer token)

**Request Body:**

```json
{
  "orderId": "order_id"
}
```

**OR**

```json
{
  "paymentIntentId": "pi_xxx"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Order status retrieved successfully",
  "data": {
    "order": {
      "id": "order_id",
      "competitionId": "competition_id",
      "competitionTitle": "Competition Title",
      "amountPence": 2500,
      "amountGBP": "25.00",
      "quantity": 5,
      "status": "completed",
      "paymentStatus": "paid",
      "ticketsReserved": [1001, 1002, 1003, 1004, 1005],
      "tickets": [
        {
          "id": "ticket_id",
          "ticketNumber": 1001,
          "status": "active"
        }
      ],
      "paymentIntent": {
        "id": "pi_xxx",
        "status": "succeeded",
        "amount": 2500,
        "currency": "gbp"
      },
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:05:00.000Z"
    }
  }
}
```

**Order Status Values:**

- `pending` - Order created, payment pending
- `completed` - Payment successful, tickets issued
- `failed` - Payment failed
- `cancelled` - Order cancelled
- `refunded` - Order refunded

**Payment Status Values:**

- `pending` - Payment not yet processed
- `paid` - Payment successful
- `failed` - Payment failed
- `refunded` - Payment refunded

**Frontend Implementation:**

```javascript
// Example: Confirm order after payment
const confirmOrder = async (orderId) => {
  const response = await fetch('/api/v1/checkout/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ orderId }),
  });

  const data = await response.json();

  if (data.data.order.paymentStatus === 'paid') {
    // Payment successful - redirect to success page
    router.push(`/checkout/success?orderId=${orderId}`);
  } else {
    // Payment still processing or failed
    // Show appropriate message
  }
};
```

---

## 2. Payment Processing with Stripe

### Stripe Integration Setup

**1. Install Stripe.js:**

```bash
npm install @stripe/stripe-js
```

**2. Initialize Stripe:**

```javascript
import { loadStripe } from '@stripe/stripe-js';

// Get publishable key from your backend config
const stripePromise = loadStripe('pk_test_...'); // Your Stripe publishable key
```

### Payment Processing Flow

**Step 1: Get Payment Intent**

```javascript
// After calling POST /checkout/payment-intent
const { clientSecret, orderId } = await createPaymentIntent(formData);
```

**Step 2: Process Payment with Stripe Elements**

```javascript
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

const stripe = await stripePromise;
const elements = stripe.elements();

// Create payment element
const paymentElement = elements.create('payment');
paymentElement.mount('#payment-element');

// Confirm payment
const { error, paymentIntent } = await stripe.confirmPayment({
  elements,
  clientSecret: clientSecret,
  confirmParams: {
    return_url: `${window.location.origin}/checkout/success`,
  },
  redirect: 'if_required', // Don't redirect automatically
});

if (error) {
  // Handle error
  console.error(error.message);
} else if (paymentIntent.status === 'succeeded') {
  // Payment successful - confirm order
  await confirmOrder(orderId);
}
```

**Complete Payment Component Example:**

```javascript
import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
);

function CheckoutForm({ clientSecret, orderId, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message);
      setIsProcessing(false);
      return;
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
      },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message);
      setIsProcessing(false);
    } else if (paymentIntent.status === 'succeeded') {
      // Payment successful
      await onSuccess(orderId);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={!stripe || isProcessing}>
        {isProcessing ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  );
}

// Usage
function CheckoutPage() {
  const [clientSecret, setClientSecret] = useState(null);
  const [orderId, setOrderId] = useState(null);

  const createPaymentIntent = async (formData) => {
    const response = await fetch('/api/v1/checkout/payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();
    setClientSecret(data.data.payment.clientSecret);
    setOrderId(data.data.order.id);
  };

  const handleSuccess = async (orderId) => {
    // Confirm order
    const response = await fetch('/api/v1/checkout/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ orderId }),
    });

    const data = await response.json();
    if (data.data.order.paymentStatus === 'paid') {
      router.push(`/checkout/success?orderId=${orderId}`);
    }
  };

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm
        clientSecret={clientSecret}
        orderId={orderId}
        onSuccess={handleSuccess}
      />
    </Elements>
  );
}
```

---

## 3. Complete Checkout Page Flow

### Step-by-Step Implementation

**1. Reserve Tickets (Before Checkout)**

```javascript
// Reserve tickets for competition
const reserveTickets = async (competitionId, quantity) => {
  const response = await fetch(`/api/v1/competitions/${competitionId}/hold`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ qty: quantity }),
  });

  const data = await response.json();
  return {
    reservedTickets: data.data.reservedTickets,
    reservedUntil: data.data.reservedUntil,
  };
};
```

**2. Load Cart on Page Mount**

```javascript
useEffect(() => {
  const loadCart = async () => {
    const response = await fetch('/api/v1/cart', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    setCart(data.data);
  };
  loadCart();
}, []);
```

**3. Collect Billing/Shipping Information**

```javascript
const [formData, setFormData] = useState({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  postalCode: '',
  country: 'GB',
  marketingOptIn: false,
});
```

**4. Create Order When User Clicks "Proceed to Payment"**

```javascript
const handleProceedToPayment = async () => {
  try {
    setIsLoading(true);

    // Get reserved tickets from cart or reservation
    const reservedTickets =
      cart.items[0].reservedTickets ||
      (await reserveTickets(
        cart.items[0].competitionId,
        cart.items[0].quantity
      ));

    // Create order with billing details and reserved tickets
    const response = await fetch('/api/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        competitionId: cart.items[0].competitionId,
        qty: cart.items[0].quantity,
        ticketsReserved: reservedTickets,
        billingDetails: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
        },
        shippingAddress: {
          line1: formData.addressLine1,
          line2: formData.addressLine2,
          city: formData.city,
          postalCode: formData.postalCode,
          country: formData.country,
        },
        marketingOptIn: formData.marketingOptIn,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const data = await response.json();
    // Order creation returns clientSecret directly
    setClientSecret(data.data.clientSecret);
    setOrderId(data.data.order.id);
    setShowPaymentForm(true);
  } catch (error) {
    setError(error.message);
  } finally {
    setIsLoading(false);
  }
};
```

**Alternative: Create Order First, Then Get Payment Intent**

```javascript
// Step 1: Create order
const orderResponse = await fetch('/api/v1/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    competitionId: cart.items[0].competitionId,
    qty: cart.items[0].quantity,
    ticketsReserved: reservedTickets,
    billingDetails: {...},
    shippingAddress: {...},
    marketingOptIn: false
  })
});

const orderData = await orderResponse.json();
const orderId = orderData.data.order.id;

// Step 2: Get payment intent (if not returned from order creation)
const paymentResponse = await fetch('/api/v1/checkout/payment-intent', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    orderId: orderId, // REQUIRED
    billingDetails: {...},
    shippingAddress: {...}
  })
});

const paymentData = await paymentResponse.json();
const clientSecret = paymentData.data.payment.clientSecret;
```

**4. Process Payment with Stripe**

```javascript
const handlePayment = async () => {
  if (!stripe || !elements) return;

  const { error, paymentIntent } = await stripe.confirmPayment({
    elements,
    clientSecret,
    redirect: 'if_required',
  });

  if (error) {
    setError(error.message);
  } else if (paymentIntent.status === 'succeeded') {
    await confirmOrder();
  }
};
```

**5. Process Payment with Stripe**

```javascript
const handlePayment = async () => {
  if (!stripe || !elements) return;

  const { error, paymentIntent } = await stripe.confirmPayment({
    elements,
    clientSecret,
    redirect: 'if_required',
  });

  if (error) {
    setError(error.message);
  } else if (paymentIntent.status === 'succeeded') {
    await confirmOrder();
  }
};
```

**6. Confirm Order After Payment**

```javascript
const confirmOrder = async () => {
  const response = await fetch('/api/v1/checkout/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ orderId }),
  });

  const data = await response.json();

  if (data.data.order.paymentStatus === 'paid') {
    // Clear cart
    await fetch('/api/v1/cart', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Redirect to success page
    router.push(`/checkout/success?orderId=${orderId}`);
  }
};
```

---

## 4. Success Page Endpoints

### Get Order Details (For Success Page)

Get order details to display on success page.

**Endpoint:** `GET /orders/:id`

**Authentication:** Required (Bearer token)

**Response:**

```json
{
  "success": true,
  "message": "Order retrieved successfully",
  "data": {
    "order": {
      "id": "order_id",
      "competitionId": "competition_id",
      "amountGBP": "25.00",
      "quantity": 5,
      "status": "completed",
      "paymentStatus": "paid",
      "tickets": [
        {
          "id": "ticket_id",
          "ticketNumber": 1001,
          "status": "active"
        }
      ],
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  }
}
```

**Frontend Implementation:**

```javascript
// On success page
useEffect(() => {
  const loadOrder = async () => {
    const orderId = router.query.orderId;
    const response = await fetch(`/api/v1/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    setOrder(data.data.order);
  };

  if (router.query.orderId) {
    loadOrder();
  }
}, [router.query.orderId]);
```

---

## 5. Error Handling

### Common Error Scenarios

**1. Cart is Empty**

```json
{
  "success": false,
  "message": "Cart is empty",
  "errors": {}
}
```

**Action:** Redirect user back to cart or competitions page.

**2. Competition No Longer Available**

```json
{
  "success": false,
  "message": "Competition Competition Title is not available",
  "errors": {}
}
```

**Action:** Remove item from cart and show message to user.

**3. Insufficient Tickets**

```json
{
  "success": false,
  "message": "Only 3 tickets remaining for Competition Title",
  "errors": {}
}
```

**Action:** Update cart quantity or remove item.

**4. Payment Failed**

```json
{
  "success": false,
  "message": "Payment failed",
  "errors": {}
}
```

**Action:** Show error message and allow user to retry payment.

**5. Tickets Not Reserved**

```json
{
  "success": false,
  "message": "Tickets must be reserved before checkout",
  "errors": {}
}
```

**Action:** Reserve tickets first, then proceed to checkout.

---

## 6. Payment Status Polling (Optional)

If you want to poll for payment status instead of relying solely on webhook:

```javascript
const pollOrderStatus = async (orderId, maxAttempts = 10) => {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

    const response = await fetch('/api/v1/checkout/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ orderId }),
    });

    const data = await response.json();
    const order = data.data.order;

    if (order.paymentStatus === 'paid') {
      return { success: true, order };
    } else if (order.paymentStatus === 'failed') {
      return { success: false, error: 'Payment failed' };
    }
  }

  return { success: false, error: 'Payment still processing' };
};
```

---

## 7. Environment Variables

**Frontend (.env.local or similar):**

```env
NEXT_PUBLIC_API_URL=https://api.royalcompetitions.co.uk/api/v1
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 8. Complete Checkout Page Structure

```javascript
// CheckoutPage.jsx
import { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import PaymentForm from './PaymentForm';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
);

export default function CheckoutPage() {
  const [cart, setCart] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [step, setStep] = useState('details'); // 'details' | 'payment' | 'success'

  // Load cart
  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    const response = await fetch('/api/v1/cart', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    setCart(data.data);
  };

  const handleCreatePaymentIntent = async (formData) => {
    const response = await fetch('/api/v1/checkout/payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();
    setClientSecret(data.data.payment.clientSecret);
    setOrderId(data.data.order.id);
    setStep('payment');
  };

  const handlePaymentSuccess = async () => {
    // Confirm order
    const response = await fetch('/api/v1/checkout/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ orderId }),
    });

    const data = await response.json();
    if (data.data.order.paymentStatus === 'paid') {
      setStep('success');
    }
  };

  return (
    <div>
      {step === 'details' && (
        <BillingForm onSubmit={handleCreatePaymentIntent} cart={cart} />
      )}

      {step === 'payment' && clientSecret && (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentForm orderId={orderId} onSuccess={handlePaymentSuccess} />
        </Elements>
      )}

      {step === 'success' && <SuccessPage orderId={orderId} />}
    </div>
  );
}
```

---

## Summary of Endpoints

| Endpoint                   | Method | Purpose                                                      | Auth Required |
| -------------------------- | ------ | ------------------------------------------------------------ | ------------- |
| `/competitions/:id/hold`   | POST   | Reserve tickets                                              | Yes           |
| `/cart`                    | GET    | Get user's cart                                              | Yes           |
| `/cart/items`              | POST   | Add item to cart                                             | Yes           |
| `/orders`                  | POST   | **Create order** (with billing details and reserved tickets) | Optional      |
| `/checkout/payment-intent` | POST   | Get payment intent for existing order                        | Yes           |
| `/checkout/confirm`        | POST   | Confirm order status                                         | Yes           |
| `/orders/:id`              | GET    | Get order details                                            | Yes           |

---

## Important Notes

1. **Order Creation First:** You MUST create an order using `POST /orders` before calling `POST /checkout/payment-intent`. The payment intent endpoint requires an `orderId`.

2. **Reserved Tickets:** Before creating an order, tickets must be reserved using `POST /competitions/:id/hold`. Pass the reserved ticket numbers in the `ticketsReserved` array when creating the order.

3. **Payment Intent from Order:** When you create an order using `POST /orders`, it automatically creates a payment intent and returns the `clientSecret`. You may not need to call `POST /checkout/payment-intent` separately unless you need to update billing details.

4. **Payment Processing:** Always use Stripe.js on the frontend - never send card details to your backend.

5. **Webhook Handling:** The webhook automatically completes orders, but you should still confirm on the frontend.

6. **Error Recovery:** Handle payment failures gracefully and allow users to retry.

7. **Cart Clearing:** Clear cart after successful payment.

8. **Security:** Always validate payment status on the backend - don't trust frontend-only validation.

9. **Testing:** Use Stripe test cards for development: `4242 4242 4242 4242`

## Common Errors and Solutions

### Error: "items is required"

**Cause:** You're calling `POST /checkout/payment-intent` without an `orderId`.  
**Solution:** Create an order first using `POST /orders`, then use the returned `orderId` to get the payment intent.

### Error: "Order ID is required"

**Cause:** The `orderId` field is missing or empty in the request body.  
**Solution:** Ensure you're passing `orderId` in the request body when calling `POST /checkout/payment-intent`.

### Error: "Tickets must be reserved before checkout"

**Cause:** The order doesn't have reserved tickets or the tickets have expired.  
**Solution:** Reserve tickets first using `POST /competitions/:id/hold`, then create the order with the reserved ticket numbers.
