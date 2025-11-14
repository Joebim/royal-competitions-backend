# User Profile API Endpoints

This document describes all endpoints for user profile, statistics, tickets, and orders.

**Base URL:** `/api/v1/users`

---

## 1. Get User Profile with Statistics

Get the authenticated user's profile along with statistics (total entries, total spent, wins, etc.).

**Endpoint:** `GET /api/v1/users/me/profile`

**Authentication:** Required (Bearer token)

**Response:**
```json
{
  "success": true,
  "message": "Profile with statistics retrieved successfully",
  "data": {
    "user": {
      "id": "user_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+44123456789",
      "role": "USER",
      "isActive": true,
      "isVerified": true,
      "subscribedToNewsletter": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "stats": {
      "totalEntries": 45,
      "totalSpent": 134.55,
      "wins": 0,
      "activeEntries": 12,
      "competitionsEntered": 23
    }
  }
}
```

**Statistics Explained:**
- `totalEntries` - Total number of active/winner tickets
- `totalSpent` - Total amount spent in GBP (from paid orders only)
- `wins` - Number of competitions won
- `activeEntries` - Number of active tickets (in live competitions)
- `competitionsEntered` - Number of distinct competitions entered

**Frontend Usage:**
```javascript
const getProfileWithStats = async () => {
  const response = await fetch('/api/v1/users/me/profile', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  return data.data; // { user, stats }
};
```

---

## 2. Get User's Tickets

Get all tickets for the authenticated user, grouped by competition.

**Endpoint:** `GET /api/v1/users/me/tickets`

**Authentication:** Required (Bearer token)

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 20)
- `competitionId` (optional) - Filter by competition ID

**Response:**
```json
{
  "success": true,
  "message": "Tickets retrieved successfully",
  "data": {
    "tickets": [
      {
        "competition": {
          "id": "competition_id",
          "title": "£500 ASOS Voucher",
          "prize": "£500 ASOS Voucher",
          "images": ["https://image-url.com/image.jpg"],
          "drawAt": "2024-12-31T00:00:00.000Z",
          "status": "live"
        },
        "tickets": [
          {
            "id": "ticket_id",
            "ticketNumber": 1001,
            "status": "active",
            "orderNumber": "RC1A2B3C4D5E6F",
            "paymentStatus": "paid",
            "createdAt": "2024-01-15T10:00:00.000Z"
          },
          {
            "id": "ticket_id_2",
            "ticketNumber": 1002,
            "status": "active",
            "orderNumber": "RC1A2B3C4D5E6F",
            "paymentStatus": "paid",
            "createdAt": "2024-01-15T10:00:00.000Z"
          }
        ]
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 45,
      "totalPages": 3
    }
  }
}
```

**Frontend Usage:**
```javascript
const getMyTickets = async (page = 1, limit = 20) => {
  const response = await fetch(
    `/api/v1/users/me/tickets?page=${page}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  const data = await response.json();
  return data.data.tickets; // Array of { competition, tickets[] }
};
```

---

## 3. Get User's Orders Grouped by Status

Get all orders for the authenticated user, grouped by order status and payment status.

**Endpoint:** `GET /api/v1/users/me/orders/grouped`

**Authentication:** Required (Bearer token)

**Response:**
```json
{
  "success": true,
  "message": "Orders retrieved and grouped successfully",
  "data": {
    "orders": {
      "pending": {
        "paid": [
          {
            "id": "order_id",
            "orderNumber": "RC1A2B3C4D5E6F",
            "competitionId": "competition_id",
            "competition": {
              "id": "competition_id",
              "title": "Luxury Car Giveaway",
              "prize": "Luxury Car",
              "images": ["https://image-url.com/image.jpg"]
            },
            "amountPence": 2500,
            "amountGBP": "25.00",
            "quantity": 5,
            "status": "pending",
            "paymentStatus": "paid",
            "ticketsReserved": [1001, 1002, 1003, 1004, 1005],
            "createdAt": "2024-01-15T10:00:00.000Z",
            "updatedAt": "2024-01-15T10:05:00.000Z"
          }
        ],
        "unpaid": [
          {
            "id": "order_id_2",
            "orderNumber": "RC7G8H9I0J1K2L3M",
            "competitionId": "competition_id_2",
            "competition": {...},
            "amountPence": 1500,
            "amountGBP": "15.00",
            "quantity": 3,
            "status": "pending",
            "paymentStatus": "pending",
            "ticketsReserved": [2001, 2002, 2003],
            "createdAt": "2024-01-14T10:00:00.000Z",
            "updatedAt": "2024-01-14T10:00:00.000Z"
          }
        ]
      },
      "completed": {
        "paid": [
          {
            "id": "order_id_3",
            "orderNumber": "RC4N5O6P7Q8R9S0T",
            "competitionId": "competition_id_3",
            "competition": {...},
            "amountPence": 5000,
            "amountGBP": "50.00",
            "quantity": 10,
            "status": "completed",
            "paymentStatus": "paid",
            "ticketsReserved": [3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010],
            "createdAt": "2024-01-10T10:00:00.000Z",
            "updatedAt": "2024-01-10T10:05:00.000Z"
          }
        ],
        "unpaid": []
      },
      "failed": [],
      "refunded": []
    },
    "summary": {
      "total": 3,
      "pending": {
        "total": 2,
        "paid": 1,
        "unpaid": 1
      },
      "completed": {
        "total": 1,
        "paid": 1,
        "unpaid": 0
      },
      "failed": 0,
      "refunded": 0
    }
  }
}
```

**Order Grouping:**
- **Pending Orders:**
  - `paid` - Orders with status "pending" but payment is "paid" (payment successful, awaiting ticket activation)
  - `unpaid` - Orders with status "pending" and payment "pending" (awaiting payment)
- **Completed Orders:**
  - `paid` - Orders with status "completed" and payment "paid" (fully completed)
  - `unpaid` - Orders with status "completed" but payment not paid (rare edge case)
- **Failed Orders:** Orders that failed
- **Refunded Orders:** Orders that were refunded

**Frontend Usage:**
```javascript
const getMyOrdersGrouped = async () => {
  const response = await fetch('/api/v1/users/me/orders/grouped', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  return data.data; // { orders: { pending: { paid, unpaid }, completed: { paid, unpaid }, failed, refunded }, summary }
};
```

**Example: Displaying Orders in UI**
```javascript
const { orders, summary } = await getMyOrdersGrouped();

// Display pending unpaid orders (need payment)
const pendingUnpaid = orders.pending.unpaid;

// Display pending paid orders (payment done, waiting for tickets)
const pendingPaid = orders.pending.paid;

// Display completed paid orders (fully completed)
const completedPaid = orders.completed.paid;
```

---

## Summary Table

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/users/me/profile` | GET | Get user profile with statistics | Yes |
| `/users/me/tickets` | GET | Get user's tickets (grouped by competition) | Yes |
| `/users/me/orders/grouped` | GET | Get user's orders grouped by status | Yes |

---

## Complete Frontend Integration Example

```javascript
// Profile page component
const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [orders, setOrders] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        setLoading(true);
        
        // Load profile with stats
        const profileRes = await fetch('/api/v1/users/me/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const profileData = await profileRes.json();
        setProfile(profileData.data);

        // Load tickets
        const ticketsRes = await fetch('/api/v1/users/me/tickets', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const ticketsData = await ticketsRes.json();
        setTickets(ticketsData.data.tickets);

        // Load orders grouped
        const ordersRes = await fetch('/api/v1/users/me/orders/grouped', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const ordersData = await ordersRes.json();
        setOrders(ordersData.data);

      } catch (error) {
        console.error('Error loading profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!profile) return <div>Error loading profile</div>;

  return (
    <div>
      {/* Profile Info */}
      <div>
        <h1>{profile.user.firstName} {profile.user.lastName}</h1>
        <p>{profile.user.email}</p>
      </div>

      {/* Stats */}
      <div>
        <div>
          <span>Total Entries:</span>
          <span>{profile.stats.totalEntries}</span>
        </div>
        <div>
          <span>Total Spent:</span>
          <span>£{profile.stats.totalSpent}</span>
        </div>
        <div>
          <span>Wins:</span>
          <span>{profile.stats.wins}</span>
        </div>
        <div>
          <span>Active Entries:</span>
          <span>{profile.stats.activeEntries}</span>
        </div>
        <div>
          <span>Competitions Entered:</span>
          <span>{profile.stats.competitionsEntered}</span>
        </div>
      </div>

      {/* Tickets */}
      <div>
        <h2>My Tickets</h2>
        {tickets.map((group) => (
          <div key={group.competition.id}>
            <h3>{group.competition.title}</h3>
            <p>{group.tickets.length} ticket(s)</p>
          </div>
        ))}
      </div>

      {/* Orders */}
      {orders && (
        <div>
          <h2>My Orders</h2>
          
          {/* Pending Unpaid */}
          {orders.orders.pending.unpaid.length > 0 && (
            <div>
              <h3>Pending Payment ({orders.summary.pending.unpaid})</h3>
              {orders.orders.pending.unpaid.map((order) => (
                <div key={order.id}>
                  <p>{order.competition.title}</p>
                  <p>£{order.amountGBP} - {order.quantity} tickets</p>
                  <p>Status: {order.paymentStatus}</p>
                </div>
              ))}
            </div>
          )}

          {/* Completed Paid */}
          {orders.orders.completed.paid.length > 0 && (
            <div>
              <h3>Completed ({orders.summary.completed.paid})</h3>
              {orders.orders.completed.paid.map((order) => (
                <div key={order.id}>
                  <p>{order.competition.title}</p>
                  <p>£{order.amountGBP} - {order.quantity} tickets</p>
                  <p>Order: {order.orderNumber}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

---

## Notes

1. **Profile Stats**: Statistics are calculated in real-time from the database, so they're always up-to-date.

2. **Tickets**: Only active and winner tickets are returned. Reserved or cancelled tickets are excluded.

3. **Orders Grouping**: Orders are grouped to make it easy to:
   - Show pending orders that need payment
   - Show completed orders
   - Display payment status clearly

4. **Performance**: All endpoints use efficient database queries with proper indexing for fast responses.

5. **Pagination**: The tickets endpoint supports pagination, while orders grouped returns all orders (consider adding pagination if needed for users with many orders).

