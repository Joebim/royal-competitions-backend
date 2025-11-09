# Royal Competitions Backend

Backend API for Royal Competitions Platform - A UK-based skill-based competition platform.

## Features

- User authentication and authorization
- Competition management
- Order processing and payment integration with Stripe
- Automated draw management compliant with UK competition regulations
- Cloudinary integration for image/video management
- Mailchimp integration for newsletter subscriptions
- Email notifications
- File upload handling
- Rate limiting and security middleware

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens) + bcrypt
- **Payment Processing**: Stripe API
- **File Upload/Management**: Multer + Cloudinary SDK
- **Email Service**: Nodemailer / SendGrid
- **Newsletter**: Mailchimp API
- **Validation**: Joi
- **Job Scheduling**: Node-cron
- **Security**: Helmet, express-rate-limit, cors, express-mongo-sanitize
- **Logging**: Winston
- **Testing**: Jest + Supertest

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB
- Stripe account
- Cloudinary account
- Mailchimp account

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp env.example .env
   ```

4. Update `.env` with your configuration values

5. Start the development server:
   ```bash
   npm run dev
   ```

### Environment Variables

See `env.example` for all required environment variables.

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/profile` - Get current user profile
- `POST /api/v1/auth/forgot-password` - Forgot password
- `POST /api/v1/auth/reset-password` - Reset password

### Competitions
- `GET /api/v1/competitions` - Get all competitions
- `GET /api/v1/competitions/:id` - Get single competition
- `POST /api/v1/competitions` - Create competition (Admin)
- `PUT /api/v1/competitions/:id` - Update competition (Admin)
- `DELETE /api/v1/competitions/:id` - Delete competition (Admin)

### Orders
- `POST /api/v1/orders` - Create order
- `GET /api/v1/orders/my-orders` - Get user orders
- `GET /api/v1/orders/:id` - Get order by ID
- `POST /api/v1/orders/:id/complete` - Complete order

### Payments
- `POST /api/v1/payments/create-intent` - Create payment intent
- `POST /api/v1/payments/webhook` - Stripe webhook handler

### Newsletter
- `POST /api/v1/newsletter/subscribe` - Subscribe to newsletter
- `POST /api/v1/newsletter/unsubscribe` - Unsubscribe from newsletter

### Upload
- `POST /api/v1/upload/image` - Upload single image
- `POST /api/v1/upload/images` - Upload multiple images
- `DELETE /api/v1/upload/image/:publicId` - Delete image

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Project Structure

```
src/
├── config/          # Configuration files
├── controllers/      # Route controllers
├── middleware/       # Custom middleware
├── models/          # Database models
├── routes/          # API routes
├── services/        # Business logic services
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── validators/      # Request validation schemas
├── jobs/            # Scheduled jobs
└── tests/           # Test files
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC

