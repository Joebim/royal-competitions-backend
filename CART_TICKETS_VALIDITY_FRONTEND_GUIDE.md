# Cart Tickets Validity & Admin Tickets Frontend Guide

This guide documents the recent changes to the cart API and admin tickets endpoint, including ticket validity handling, reserved tickets with 24-hour expiry, and order failure management.

## Table of Contents

1. [Cart API Changes - ticketsValid Field](#cart-api-changes---ticketsvalid-field)
2. [Admin Tickets Endpoint Updates](#admin-tickets-endpoint-updates)
3. [Invalid Tickets Handling](#invalid-tickets-handling)
4. [Reserved Tickets with 24-Hour Expiry](#reserved-tickets-with-24-hour-expiry)
5. [Order Failure on Ticket Expiry](#order-failure-on-ticket-expiry)
6. [Frontend Implementation Examples](#frontend-implementation-examples)

---

## Cart API Changes - ticketsValid Field

### Overview

The `ticketsValid` field has been added to cart items to track whether tickets are valid for draws (based on answer correctness). This field persists through checkout and is used when creating orders.

### API Endpoints Affected

#### 1. POST `/api/v1/cart/items` - Add/Update Cart Item

**Request Body:**
```json
{
  "competitionId": "6922428f2104fdc938b27f8",
  "quantity": 1,
  "ticketType": "lucky_draw",
  "ticketNumbers": [7],
  "ticketsValid": false  // NEW: Optional boolean field
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "692f6a540ca1710fa12a7b02",
    "items": [
      {
        "id": "692f6a540ca1710fa12a7b02",
        "competitionId": "6922428f2104fdc938b27f8",
        "quantity": 1,
        "unitPrice": 3.25,
        "subtotal": 3.25,
        "ticketsValid": false,  // ← NOW INCLUDED IN RESPONSE
        "ticketNumbers": [7],
        "ticketType": "lucky_draw",
        "addedAt": "2025-12-02T22:38:12.065Z",
        "updatedAt": "2025-12-02T22:38:12.065Z",
        "competition": { ... }
      }
    ],
    "totals": { ... }
  }
}
```

#### 2. GET `/api/v1/cart` - Get Cart

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "692f6a540ca1710fa12a7b02",
        "competitionId": "6922428f2104fdc938b27f8",
        "quantity": 1,
        "ticketsValid": false,  // ← NOW INCLUDED
        "ticketNumbers": [7],
        "unitPrice": 3.25,
        "subtotal": 3.25,
        ...
      }
    ]
  }
}
```

#### 3. PATCH `/api/v1/cart/items/:itemId` - Update Cart Item

**Request Body:**
```json
{
  "quantity": 2,
  "ticketNumbers": [7, 8],
  "ticketsValid": false  // NEW: Optional boolean field
}
```

**Response:** Same format as GET `/api/v1/cart`

### Frontend Implementation

#### Adding ticketsValid to Cart Items

```javascript
// When adding item to cart with invalid answer
const addToCart = async (competitionId, quantity, ticketNumbers, ticketsValid = true) => {
  const response = await fetch('/api/v1/cart/items', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      competitionId,
      quantity,
      ticketNumbers,
      ticketType: 'number_picker',
      ticketsValid  // Pass ticketsValid from answer validation
    })
  });
  
  const data = await response.json();
  // ticketsValid is now included in response
  return data.data.items[0].ticketsValid;
};
```

#### Displaying ticketsValid Status

```javascript
// In cart component
const CartItem = ({ item }) => {
  const isValid = item.ticketsValid !== false; // Default to true
  
  return (
    <div className="cart-item">
      <h3>{item.competition.title}</h3>
      <p>Quantity: {item.quantity}</p>
      {!isValid && (
        <div className="warning-banner">
          ⚠️ These tickets are invalid and will not be eligible for draws
        </div>
      )}
    </div>
  );
};
```

---

## Admin Tickets Endpoint Updates

### Endpoint

**GET** `/api/v1/admin/competitions/:id/tickets`

### Changes

1. **Invalid tickets now included** - Tickets with `isValid: false` are now visible
2. **Reserved tickets included** - Reserved tickets from orders are now visible
3. **reservedUntil field** - Always included for reserved tickets

### Query Parameters

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `status` (optional): Filter by status (case-insensitive, e.g., "Reserved", "reserved", "RESERVED")

### Response Format

```json
{
  "success": true,
  "data": {
    "tickets": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "competitionId": "507f1f77bcf86cd799439012",
        "ticketNumber": 1,
        "userId": {
          "_id": "507f1f77bcf86cd799439013",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john.doe@example.com",
          "phone": "+44123456789"
        },
        "orderId": {
          "_id": "507f1f77bcf86cd799439014",
          "paymentStatus": "paid"
        },
        "status": "reserved",  // Can be: reserved, active, winner, cancelled, refunded, invalid
        "isValid": true,  // ← ALWAYS INCLUDED (false for invalid tickets)
        "reservedUntil": "2024-01-16T14:30:00.000Z",  // ← INCLUDED FOR RESERVED TICKETS
        "createdAt": "2024-01-15T14:15:00.000Z",
        "updatedAt": "2024-01-15T14:15:00.000Z"
      },
      {
        "_id": "507f1f77bcf86cd799439015",
        "ticketNumber": 2,
        "status": "active",
        "isValid": false,  // ← INVALID TICKET (incorrect answer)
        // reservedUntil not included for non-reserved tickets
        ...
      },
      {
        "_id": "507f1f77bcf86cd799439016",
        "ticketNumber": 3,
        "status": "active",
        "isValid": true,
        ...
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "totalItems": 150,
      "totalPages": 3
    }
  }
}
```

### Frontend Implementation

#### Fetching Admin Tickets

```javascript
const fetchAdminTickets = async (competitionId, page = 1, limit = 50, status = null) => {
  let url = `/api/v1/admin/competitions/${competitionId}/tickets?page=${page}&limit=${limit}`;
  if (status) {
    url += `&status=${status}`; // Case-insensitive: "Reserved", "reserved", "RESERVED" all work
  }
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${adminToken}`
    }
  });
  
  const data = await response.json();
  return data.data.tickets;
};
```

#### Displaying Tickets with Status Indicators

```javascript
const AdminTicketsList = ({ tickets }) => {
  return (
    <table>
      <thead>
        <tr>
          <th>Ticket #</th>
          <th>Status</th>
          <th>Valid</th>
          <th>Reserved Until</th>
          <th>User</th>
        </tr>
      </thead>
      <tbody>
        {tickets.map(ticket => (
          <tr key={ticket._id}>
            <td>{ticket.ticketNumber}</td>
            <td>
              <span className={`status-badge status-${ticket.status}`}>
                {ticket.status}
              </span>
            </td>
            <td>
              {ticket.isValid === false ? (
                <span className="invalid-badge">❌ Invalid</span>
              ) : (
                <span className="valid-badge">✅ Valid</span>
              )}
            </td>
            <td>
              {ticket.status === 'reserved' && ticket.reservedUntil ? (
                <span>
                  {new Date(ticket.reservedUntil).toLocaleString()}
                  <br />
                  <small>
                    ({Math.round((new Date(ticket.reservedUntil) - new Date()) / (1000 * 60 * 60))}h remaining)
                  </small>
                </span>
              ) : (
                <span>-</span>
              )}
            </td>
            <td>
              {ticket.userId ? (
                `${ticket.userId.firstName} ${ticket.userId.lastName}`
              ) : (
                'Guest'
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

#### Filtering by Status

```javascript
// Filter by reserved tickets
const reservedTickets = await fetchAdminTickets(competitionId, 1, 50, 'reserved');

// Filter by active tickets
const activeTickets = await fetchAdminTickets(competitionId, 1, 50, 'active');

// Get all tickets (no filter)
const allTickets = await fetchAdminTickets(competitionId, 1, 50);
```

---

## Invalid Tickets Handling

### What Makes a Ticket Invalid?

A ticket is marked as `isValid: false` when:
- The user provides an incorrect answer to the competition question
- The frontend sends `ticketsValid: false` when adding to cart or creating order

### Flow

1. **User answers question incorrectly** → Frontend sets `ticketsValid: false`
2. **Add to cart** → Cart item stores `ticketsValid: false`
3. **Checkout** → Order stores `ticketsValid: false`
4. **Payment completes** → Tickets are created with `isValid: false`
5. **Draw** → Invalid tickets are automatically excluded from draws

### Frontend Implementation

#### Validating Answer and Setting ticketsValid

```javascript
const handleAnswerSubmit = async (competitionId, answer) => {
  // Get correct answer from competition
  const competition = await fetchCompetition(competitionId);
  const isCorrect = answer.toLowerCase().trim() === 
    competition.question.correctAnswer.toLowerCase().trim();
  
  // Add to cart with ticketsValid
  await addToCart({
    competitionId,
    quantity: 1,
    ticketNumbers: [selectedTicketNumber],
    ticketsValid: isCorrect  // false if answer is wrong
  });
  
  if (!isCorrect) {
    showWarning('Your answer is incorrect. These tickets will not be eligible for draws.');
  }
};
```

#### Displaying Invalid Ticket Warning

```javascript
const CheckoutSummary = ({ cartItems }) => {
  const invalidItems = cartItems.filter(item => item.ticketsValid === false);
  
  return (
    <div>
      {invalidItems.length > 0 && (
        <div className="alert alert-warning">
          <h4>⚠️ Invalid Tickets Warning</h4>
          <p>
            {invalidItems.length} item(s) contain invalid tickets that will not be 
            eligible for draws due to incorrect answers.
          </p>
          <ul>
            {invalidItems.map(item => (
              <li key={item.id}>
                {item.competition.title} - Ticket #{item.ticketNumbers.join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
```

---

## Reserved Tickets with 24-Hour Expiry

### Overview

When an order is created (but not yet paid), tickets are reserved for **24 hours** instead of the previous 15 minutes. This gives users more time to complete payment.

### Key Changes

1. **Reservation Duration**: 15 minutes → 24 hours
2. **Order Association**: Reserved tickets are now associated with `orderId`
3. **Visibility**: Reserved tickets from orders are visible in admin tickets endpoint
4. **Expiry Tracking**: `reservedUntil` field shows when reservation expires

### Flow

1. **User adds to cart** → Tickets reserved for 15 minutes (cart reservation)
2. **User creates order** → Tickets extended to 24 hours and associated with order
3. **User pays** → Tickets become ACTIVE, `reservedUntil` removed
4. **24 hours pass without payment** → Order marked as FAILED, tickets deleted

### Frontend Implementation

#### Displaying Reserved Ticket Expiry

```javascript
const ReservedTicketCountdown = ({ reservedUntil }) => {
  const [timeRemaining, setTimeRemaining] = useState('');
  
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const expiry = new Date(reservedUntil);
      const diff = expiry - now;
      
      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [reservedUntil]);
  
  return (
    <div className="reservation-countdown">
      <span className="label">Reservation expires in:</span>
      <span className="time">{timeRemaining}</span>
    </div>
  );
};
```

#### Showing Reserved Tickets in Admin

```javascript
const AdminReservedTickets = ({ competitionId }) => {
  const [reservedTickets, setReservedTickets] = useState([]);
  
  useEffect(() => {
    const fetchReserved = async () => {
      const tickets = await fetchAdminTickets(competitionId, 1, 100, 'reserved');
      setReservedTickets(tickets);
    };
    fetchReserved();
  }, [competitionId]);
  
  return (
    <div>
      <h3>Reserved Tickets ({reservedTickets.length})</h3>
      {reservedTickets.map(ticket => (
        <div key={ticket._id} className="reserved-ticket-card">
          <div>Ticket #{ticket.ticketNumber}</div>
          <div>User: {ticket.userId?.email || 'Guest'}</div>
          <div>
            Reserved Until: {new Date(ticket.reservedUntil).toLocaleString()}
          </div>
          <ReservedTicketCountdown reservedUntil={ticket.reservedUntil} />
        </div>
      ))}
    </div>
  );
};
```

---

## Order Failure on Ticket Expiry

### Overview

Orders are automatically marked as `FAILED` when their reserved tickets expire after 24 hours without payment.

### Order Status Flow

1. **Order Created** → `status: "pending"`, `paymentStatus: "pending"`
2. **24 Hours Pass** → `status: "failed"`, `paymentStatus: "failed"`
3. **Tickets Deleted** → Reserved tickets are automatically removed

### Frontend Implementation

#### Checking Order Status

```javascript
const checkOrderStatus = async (orderId) => {
  const response = await fetch(`/api/v1/orders/${orderId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  const order = data.data.order;
  
  if (order.status === 'failed' && order.paymentStatus === 'failed') {
    return {
      status: 'expired',
      message: 'Your order has expired. Please create a new order to complete your purchase.'
    };
  }
  
  return { status: order.status, order };
};
```

#### Handling Expired Orders

```javascript
const OrderStatusPage = ({ orderId }) => {
  const [orderStatus, setOrderStatus] = useState(null);
  
  useEffect(() => {
    const checkStatus = async () => {
      const status = await checkOrderStatus(orderId);
      setOrderStatus(status);
    };
    checkStatus();
    
    // Poll every 30 seconds to check for expiry
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [orderId]);
  
  if (orderStatus?.status === 'expired') {
    return (
      <div className="expired-order-alert">
        <h2>⏰ Order Expired</h2>
        <p>{orderStatus.message}</p>
        <button onClick={() => navigateToCart()}>
          Return to Cart
        </button>
      </div>
    );
  }
  
  // ... rest of order status display
};
```

---

## Frontend Implementation Examples

### Complete Cart Flow with ticketsValid

```javascript
// 1. User answers question
const handleQuestionAnswer = async (competitionId, answer) => {
  const competition = await fetchCompetition(competitionId);
  const isCorrect = answer === competition.question.correctAnswer;
  
  // 2. Add to cart with ticketsValid
  const cartItem = await addToCart({
    competitionId,
    quantity: 1,
    ticketNumbers: [selectedTicket],
    ticketsValid: isCorrect
  });
  
  // 3. Show warning if invalid
  if (!isCorrect) {
    showNotification('Answer incorrect. Tickets will not be eligible for draws.', 'warning');
  }
  
  return cartItem;
};

// 4. Display cart with validity status
const CartPage = () => {
  const { cart } = useCart();
  
  return (
    <div>
      {cart.items.map(item => (
        <CartItem 
          key={item.id} 
          item={item}
          showValidityWarning={item.ticketsValid === false}
        />
      ))}
    </div>
  );
};

// 5. Checkout - ticketsValid is automatically passed to order
const checkout = async (cart) => {
  // ticketsValid from cart items is automatically included in order
  const orders = await createCheckoutFromCart({
    billingDetails,
    shippingAddress
  });
  
  return orders;
};
```

### Admin Tickets Dashboard

```javascript
const AdminTicketsDashboard = ({ competitionId }) => {
  const [tickets, setTickets] = useState([]);
  const [filters, setFilters] = useState({
    status: null,
    isValid: null
  });
  
  useEffect(() => {
    fetchTickets();
  }, [filters]);
  
  const fetchTickets = async () => {
    let url = `/api/v1/admin/competitions/${competitionId}/tickets?page=1&limit=100`;
    if (filters.status) {
      url += `&status=${filters.status}`;
    }
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    const data = await response.json();
    let filteredTickets = data.data.tickets;
    
    // Client-side filter for isValid (if needed)
    if (filters.isValid !== null) {
      filteredTickets = filteredTickets.filter(
        t => (filters.isValid ? t.isValid !== false : t.isValid === false)
      );
    }
    
    setTickets(filteredTickets);
  };
  
  return (
    <div>
      <div className="filters">
        <select 
          value={filters.status || ''} 
          onChange={(e) => setFilters({...filters, status: e.target.value || null})}
        >
          <option value="">All Statuses</option>
          <option value="reserved">Reserved</option>
          <option value="active">Active</option>
          <option value="winner">Winner</option>
        </select>
        
        <select
          value={filters.isValid === null ? '' : filters.isValid ? 'valid' : 'invalid'}
          onChange={(e) => {
            const value = e.target.value;
            setFilters({
              ...filters, 
              isValid: value === '' ? null : value === 'valid'
            });
          }}
        >
          <option value="">All Tickets</option>
          <option value="valid">Valid Only</option>
          <option value="invalid">Invalid Only</option>
        </select>
      </div>
      
      <TicketsTable tickets={tickets} />
    </div>
  );
};
```

### Summary Statistics Component

```javascript
const TicketsSummary = ({ competitionId }) => {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    reserved: 0,
    invalid: 0,
    winners: 0
  });
  
  useEffect(() => {
    const calculateStats = async () => {
      const allTickets = await fetchAdminTickets(competitionId, 1, 10000);
      
      setStats({
        total: allTickets.length,
        active: allTickets.filter(t => t.status === 'active').length,
        reserved: allTickets.filter(t => t.status === 'reserved').length,
        invalid: allTickets.filter(t => t.isValid === false).length,
        winners: allTickets.filter(t => t.status === 'winner').length
      });
    };
    
    calculateStats();
  }, [competitionId]);
  
  return (
    <div className="stats-grid">
      <StatCard label="Total Tickets" value={stats.total} />
      <StatCard label="Active" value={stats.active} />
      <StatCard label="Reserved" value={stats.reserved} />
      <StatCard label="Invalid" value={stats.invalid} className="warning" />
      <StatCard label="Winners" value={stats.winners} className="success" />
    </div>
  );
};
```

---

## API Response Examples

### Cart Response with ticketsValid

```json
{
  "success": true,
  "data": {
    "id": "692f6a540ca1710fa12a7b02",
    "currency": "GBP",
    "items": [
      {
        "id": "692f6a540ca1710fa12a7b02",
        "competitionId": "6922428f2104fdc938b27f8",
        "quantity": 1,
        "unitPrice": 3.25,
        "subtotal": 3.25,
        "ticketsValid": false,
        "ticketNumbers": [7],
        "ticketType": "lucky_draw",
        "addedAt": "2025-12-02T22:38:12.065Z",
        "updatedAt": "2025-12-02T22:38:12.065Z",
        "competition": {
          "id": "6922428f2104fdc938b27f8",
          "title": "Win a Luxury Car",
          "ticketPrice": "3.25",
          ...
        }
      }
    ],
    "totals": {
      "items": 1,
      "subtotal": 3.25,
      "totalTickets": 1
    }
  }
}
```

### Admin Tickets Response

```json
{
  "success": true,
  "data": {
    "tickets": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "ticketNumber": 1,
        "status": "reserved",
        "isValid": true,
        "reservedUntil": "2024-01-16T14:30:00.000Z",
        "userId": {
          "_id": "507f1f77bcf86cd799439013",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john.doe@example.com"
        },
        "orderId": {
          "_id": "507f1f77bcf86cd799439014",
          "paymentStatus": "pending"
        },
        "createdAt": "2024-01-15T14:15:00.000Z"
      },
      {
        "_id": "507f1f77bcf86cd799439015",
        "ticketNumber": 2,
        "status": "active",
        "isValid": false,
        "userId": { ... },
        "orderId": { ... },
        "createdAt": "2024-01-14T10:20:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "totalItems": 150,
      "totalPages": 3
    }
  }
}
```

---

## Migration Notes

### Breaking Changes

**None** - All changes are backward compatible. Existing code will continue to work.

### New Features

1. `ticketsValid` field in cart items (optional, defaults to `true`)
2. `isValid` field always included in admin tickets response
3. `reservedUntil` field included for reserved tickets
4. Reserved tickets from orders now visible in admin endpoint
5. Invalid tickets now visible in admin endpoint

### Recommended Updates

1. **Update cart display** to show `ticketsValid` status
2. **Update admin dashboard** to display `isValid` and `reservedUntil` fields
3. **Add expiry countdown** for reserved tickets
4. **Handle expired orders** gracefully in UI

---

## Testing Checklist

- [ ] Add item to cart with `ticketsValid: false` - verify it's returned in response
- [ ] Get cart - verify `ticketsValid` is included for all items
- [ ] Update cart item - verify `ticketsValid` can be updated
- [ ] Admin tickets endpoint - verify invalid tickets (`isValid: false`) are visible
- [ ] Admin tickets endpoint - verify reserved tickets are visible
- [ ] Admin tickets endpoint - verify `reservedUntil` is included for reserved tickets
- [ ] Filter by status - verify case-insensitive status filtering works
- [ ] Create order - verify reserved tickets have 24-hour expiry
- [ ] Check expired order - verify order status becomes `FAILED` after 24 hours

---

## Support

For questions or issues, please contact the backend team or refer to the API documentation.


