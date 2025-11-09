import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './environment';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Royal Competitions API',
      version: '1.0.0',
      description: 'Backend API for Royal Competitions Platform - A UK-based skill-based competition platform',
      contact: {
        name: 'Royal Competitions',
        email: 'info@royalcompetitions.co.uk',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
      {
        url: 'https://api.royalcompetitions.co.uk',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'authToken',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Operation successful',
            },
            data: {
              type: 'object',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            role: {
              type: 'string',
              enum: ['user', 'admin', 'super_admin'],
            },
            isVerified: { type: 'boolean' },
            isActive: { type: 'boolean' },
            subscribedToNewsletter: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Competition: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            shortDescription: { type: 'string' },
            description: { type: 'string' },
            prize: { type: 'string' },
            prizeValue: { type: 'number' },
            cashAlternative: { type: 'number' },
            cashAlternativeDetails: { type: 'string' },
            ticketPrice: { type: 'number' },
            originalPrice: { type: 'number' },
            maxTickets: { type: 'integer' },
            soldTickets: { type: 'integer' },
            features: {
              type: 'array',
              items: { type: 'string' },
            },
            included: {
              type: 'array',
              items: { type: 'string' },
            },
            specifications: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string' },
                  value: { type: 'string' },
                },
              },
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
            },
            termsAndConditions: { type: 'string' },
            slug: { type: 'string' },
            images: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  url: { type: 'string' },
                  publicId: { type: 'string' },
                  thumbnail: { type: 'string' },
                },
              },
            },
            status: {
              type: 'string',
              enum: ['draft', 'active', 'drawing', 'completed', 'cancelled'],
            },
            question: {
              type: 'object',
              properties: {
                question: { type: 'string' },
                options: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
            drawDate: { type: 'string', format: 'date-time' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            category: { type: 'string' },
            featured: { type: 'boolean' },
            isGuaranteedDraw: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Draw: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            competitionId: { type: 'string' },
            competitionTitle: { type: 'string' },
            prizeName: { type: 'string' },
            prizeValue: { type: 'number' },
            winnerId: { type: 'string' },
            winnerName: { type: 'string' },
            winnerLocation: { type: 'string' },
            drawDate: { type: 'string', format: 'date-time' },
            drawnAt: { type: 'string', format: 'date-time' },
            totalTickets: { type: 'integer' },
            winningTicketNumber: { type: 'integer' },
            imageUrl: { type: 'string' },
            isActive: { type: 'boolean' },
          },
        },
        Champion: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            drawId: { type: 'string' },
            competitionId: { type: 'string' },
            winnerId: { type: 'string' },
            winnerName: { type: 'string' },
            winnerLocation: { type: 'string' },
            prizeName: { type: 'string' },
            prizeValue: { type: 'string' },
            testimonial: { type: 'string' },
            image: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                publicId: { type: 'string' },
              },
            },
            featured: { type: 'boolean' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    tags: [
      { name: 'Authentication', description: 'User authentication endpoints' },
      { name: 'Competitions', description: 'Competition management endpoints' },
      { name: 'Draws', description: 'Draw management endpoints' },
      { name: 'Champions', description: 'Champion/Winner management endpoints' },
      { name: 'Users', description: 'User management endpoints' },
      { name: 'Orders', description: 'Order management endpoints' },
      { name: 'Payments', description: 'Payment processing endpoints' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
