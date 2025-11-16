🧩 1. How They All Connect (Simple Breakdown)

Think of the system like this:

Competition

The main product.
Contains:

Prize details

Ticket price

Max tickets

Draw date

Status (active, upcoming, ended, drawn)

A Competition contains many tickets.

Tickets

When a user buys entries, they get tickets.
Tickets store:

User ID

Ticket number(s)

Competition ID

Purchase date

Status (active, refunded, invalid)

Tickets are used to pick a winner.

Draw

A Draw is the event where the system or admin selects a winner.

A Draw connects:

Competition

Pool of purchased tickets

Winner selection (automatic or manual)

Outcome (winner, winning ticket number)

You can have:

Automatic Draws — system picks winner randomly

Admin-Triggered Draws — admin clicks “Perform Draw”

Manual Winner Entry — for situations where admin wants to override

Winner

When a draw happens, the system generates:

Winning Ticket Number

Winning User

Timestamp

Verification status

Public announcement text

Winner belongs to:

User

Ticket

Competition

Draw event

Champions (Optional Feature)

This is simply:

A list of all winners across all competitions.

Used for:

Homepage hero

Winners page

Social proof

🔗 2. Full Relationship Map (Backend Data Model)
Competition  
     |
     | 1-to-many
     v
Ticket (user entries)
     |
     | grouped for a draw
     v
Draw (automatic or admin-triggered)
     |
     | selects
     v
Winner (belongs to user + competition + ticket)
     |
     v
Champions List (collection of all winners)

🚀 3. FRONTEND FLOW (User Journey)
A. Visiting Competitions Page

Frontend calls:

GET /competitions?status=active
Shows:

Active competitions

Ticket price

End date

Progress bar (soldTickets / maxTickets)

B. Viewing a Single Competition

Frontend fetches:

GET /competitions/:id

GET /tickets/user?competitionId=xxx

GET /draws/:competitionId (if completed)

User can:

See prize

Select entry amount

Add to cart

Checkout

C. Checkout → Payment → Ticket Generation

User pays with Stripe → Frontend receives success → Backend webhook fires.

Backend:

Validates payment

Generates ticket numbers

Saves tickets in DB

Sends Klaviyo email (“Order Placed”)

Sends SMS confirmation

Frontend:

Shows “Your Tickets”

Redirects to user dashboard

D. Draw Time (Frontend Behavior)

Frontend shows:

Countdown

Mark as “Closing Soon”

Disables ticket purchase once endDate passes

If draw completed:

Shows winning ticket

Shows winner card

Shows “Watch Live Draw Replay” (optional)

🔥 4. BACKEND FLOW (Core Logic)
A. Admin Creates Competition

Backend accepts:

Prize details

Ticket pricing

Start/end/draw dates

Question + answer

Images

Max tickets

Competition saved as draft until admin activates it.

B. Admin Activates Competition

Backend sets:

status: "active"

isActive: true

Makes competition visible to users

C. During Sale Period

Backend must:

Track tickets sold

Prevent selling more than maxTickets

Lock if competition expired

Update progress

D. Draw Logic
Two modes:
1. Automatic Draw

When endDate or drawDate is reached:

Backend cron job selects a random ticket:

winnerTicket = tickets[Math.floor(Math.random() * tickets.length)];


Creates Draw record

Creates Winner record

Marks competition as “drawn”

Sends Klaviyo “Winner Announced” email & SMS

2. Admin-Triggered Draw (Manual Button)

Admin presses “Perform Draw Now”:
Backend:

Fetches all tickets

Selects random ticket

Saves Draw

Saves Winner

Updates competition status

Sends notifications

3. Manual Winner Entry

Admin manually chooses a winner:
Backend:

Saves draw record with "manual": true

Creates winner

Updates competition

Used when:

Winner chosen externally

Live event draw

E. After Draw

Backend should:

Lock competition

Prevent new ticket purchases

Save final winner

Generate public winners info

Add to champions list

Notify winner

Notify admins


🛠️ 5. Admin Operations (What You Must Support)
Competitions

Create competition
Edit competition
Activate / deactivate
Duplicate competition
Change start/end/draw dates
Add media/images
Mark as featured
Delete competition


Tickets

View all ticket purchases
Search by user, ticket number, or order ID
Refund ticket
Export tickets to CSV


Draws

Automatic draw enable/disable
Trigger draw manually
Override winner manually
View draw log/history
Replay draw randomness seed (optional but professional)


Winners

Approve winner
Add manual winner details
Upload winner photo/video
Send winner announcement message
Publish to “Champions” page
Mark prize as delivered


Users

Ban/unban user
Verify user manually
See user tickets
See user orders



Notifications (via Klaviyo backend integration)

Send “Checkout Started”
Send “Order Placed”
Send “Competition Entered”
Send “Winner Announcement”
Send “Prize Delivered”