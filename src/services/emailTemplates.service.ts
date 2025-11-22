import { config } from '../config/environment';

/**
 * Email Templates Service
 * Creates luxury email templates with Navy and Gold branding
 * Font: Montserrat
 */

interface EmailTemplateOptions {
  firstName?: string;
  lastName?: string;
  [key: string]: any;
}

class EmailTemplatesService {
  /**
   * Base template wrapper with luxury styling
   */
  private getBaseTemplate(content: string, title: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Royal Competitions</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f5f5f5;
      line-height: 1.6;
      color: #101e2e;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #101e2e 0%, #1a2838 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .header-logo {
      max-width: 300px;
      height: auto;
      margin: 0 auto 15px;
      display: block;
    }
    .header-logo img {
      max-width: 100%;
      height: auto;
      display: block;
    }
    .header-tagline {
      color: #f5cb86;
      font-size: 14px;
      font-weight: 300;
      letter-spacing: 1px;
    }
    .content {
      padding: 50px 40px;
      background-color: #ffffff;
    }
    .content-title {
      color: #101e2e;
      font-size: 28px;
      font-weight: 600;
      margin-bottom: 20px;
      line-height: 1.3;
    }
    .content-text {
      color: #1a2838;
      font-size: 16px;
      line-height: 1.8;
      margin-bottom: 20px;
    }
    .button {
      display: inline-block;
      padding: 16px 40px;
      background: linear-gradient(135deg, #e3b03e 0%, #f5cb86 100%);
      color: #101e2e;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      margin: 30px 0;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(227, 176, 62, 0.3);
    }
    .button:hover {
      background: linear-gradient(135deg, #f5cb86 0%, #e3b03e 100%);
      box-shadow: 0 6px 20px rgba(227, 176, 62, 0.4);
      transform: translateY(-2px);
    }
    .button-secondary {
      background: transparent;
      border: 2px solid #e3b03e;
      color: #e3b03e;
      box-shadow: none;
    }
    .button-secondary:hover {
      background: #e3b03e;
      color: #101e2e;
    }
    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, #e3b03e, transparent);
      margin: 40px 0;
    }
    .info-box {
      background: linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%);
      border-left: 4px solid #e3b03e;
      padding: 20px;
      margin: 30px 0;
      border-radius: 4px;
    }
    .info-box-title {
      color: #101e2e;
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 10px;
    }
    .info-box-text {
      color: #1a2838;
      font-size: 14px;
      line-height: 1.6;
    }
    .footer {
      background-color: #101e2e;
      padding: 40px 30px;
      text-align: center;
      color: #f5cb86;
    }
    .footer-text {
      font-size: 14px;
      line-height: 1.8;
      margin-bottom: 20px;
    }
    .footer-links {
      margin: 20px 0;
    }
    .footer-links a {
      color: #e3b03e;
      text-decoration: none;
      margin: 0 15px;
      font-size: 14px;
      font-weight: 500;
    }
    .footer-links a:hover {
      color: #f5cb86;
      text-decoration: underline;
    }
    .footer-copyright {
      font-size: 12px;
      color: #7e5936;
      margin-top: 20px;
    }
    .ticket-details {
      background: #f5f5f5;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .ticket-item {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .ticket-item:last-child {
      border-bottom: none;
    }
    .ticket-label {
      color: #1a2838;
      font-weight: 500;
    }
    .ticket-value {
      color: #101e2e;
      font-weight: 600;
    }
    .highlight {
      color: #e3b03e;
      font-weight: 600;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 30px 20px;
      }
      .header {
        padding: 30px 20px;
      }
      .header-logo {
        max-width: 250px;
      }
      .header-logo img {
        max-width: 100%;
      }
      .content-title {
        font-size: 24px;
      }
      .button {
        padding: 14px 30px;
        font-size: 14px;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="header-logo">
        <img src="https://res.cloudinary.com/dtaegi6gk/image/upload/v1761790589/RC_transp_landsc_tcykeq.png" alt="Royal Competitions" style="max-width: 200px; height: auto; display: block; margin: 0 auto;">
      </div>
      <div class="header-tagline">Luxury Prize Draws & Exclusive Competitions</div>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <div class="footer-text">
        <strong style="color: #e3b03e;">Royal Competitions</strong><br>
        Your trusted platform for luxury prize draws
      </div>
      <div class="footer-links">
        <a href="${config.frontendUrl}">Visit Website</a>
        <a href="${config.frontendUrl}/contact">Contact Support</a>
        <a href="${config.frontendUrl}/terms">Terms & Conditions</a>
        <a href="${config.frontendUrl}/privacy">Privacy Policy</a>
      </div>
      <div class="footer-copyright">
        © ${new Date().getFullYear()} Royal Competitions. All rights reserved.
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Email Verification Template
   */
  getVerificationEmail(
    options: EmailTemplateOptions & { verificationToken: string }
  ): string {
    const verificationUrl = `${config.frontendUrl}/auth/verify-email?token=${options.verificationToken}`;
    const firstName = options.firstName || 'Valued Customer';

    const content = `
      <h1 class="content-title">Welcome to Royal Competitions, ${firstName}!</h1>
      <p class="content-text">
        Thank you for joining our exclusive community of luxury prize draw enthusiasts. 
        We're thrilled to have you on board!
      </p>
      <p class="content-text">
        To complete your registration and start entering our exciting competitions, 
        please verify your email address by clicking the button below.
      </p>
      <div style="text-align: center;">
        <a href="${verificationUrl}" class="button">Verify Email Address</a>
      </div>
      <div class="info-box">
        <div class="info-box-title">🔒 Security Notice</div>
        <div class="info-box-text">
          This verification link will expire in <strong>24 hours</strong>. 
          If you didn't create an account with Royal Competitions, please ignore this email.
        </div>
      </div>
      <p class="content-text" style="color: #7e5936; font-size: 14px; margin-top: 30px;">
        Or copy and paste this link into your browser:<br>
        <a href="${verificationUrl}" style="color: #e3b03e; word-break: break-all;">${verificationUrl}</a>
      </p>
    `;

    return this.getBaseTemplate(content, 'Verify Your Email');
  }

  /**
   * Password Reset Template
   */
  getPasswordResetEmail(
    options: EmailTemplateOptions & { resetToken: string }
  ): string {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${options.resetToken}`;
    const firstName = options.firstName || 'Valued Customer';

    const content = `
      <h1 class="content-title">Password Reset Request</h1>
      <p class="content-text">
        Hello ${firstName},
      </p>
      <p class="content-text">
        We received a request to reset your password for your Royal Competitions account. 
        Click the button below to create a new secure password.
      </p>
      <div style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </div>
      <div class="info-box">
        <div class="info-box-title">⏰ Important</div>
        <div class="info-box-text">
          This link will expire in <strong>1 hour</strong> for security reasons. 
          If you didn't request a password reset, please ignore this email and your password will remain unchanged.
        </div>
      </div>
      <p class="content-text" style="color: #7e5936; font-size: 14px; margin-top: 30px;">
        Or copy and paste this link into your browser:<br>
        <a href="${resetUrl}" style="color: #e3b03e; word-break: break-all;">${resetUrl}</a>
      </p>
    `;

    return this.getBaseTemplate(content, 'Reset Your Password');
  }

  /**
   * Order Confirmation Template
   */
  getOrderConfirmationEmail(
    options: EmailTemplateOptions & {
      orderNumber: string;
      competitionTitle: string;
      ticketNumbers: number[];
      amountGBP: string;
      orderId: string;
    }
  ): string {
    const firstName = options.firstName || 'Valued Customer';
    const orderUrl = 'https://www.royalcompetitions.co.uk/profile/orders';

    const content = `
      <h1 class="content-title">Order Confirmation</h1>
      <p class="content-text">
        Hello ${firstName},
      </p>
      <p class="content-text">
        Thank you for your order! We've successfully received your entry for 
        <span class="highlight">${options.competitionTitle}</span>.
      </p>
      <div class="ticket-details">
        <div class="ticket-item">
          <span class="ticket-label">Order Number</span>
          <span class="ticket-value">${options.orderNumber}</span>
        </div>
        <div class="ticket-item">
          <span class="ticket-label">Competition</span>
          <span class="ticket-value">${options.competitionTitle}</span>
        </div>
        <div class="ticket-item">
          <span class="ticket-label">Total Amount</span>
          <span class="ticket-value">£${options.amountGBP}</span>
        </div>
        <div class="ticket-item">
          <span class="ticket-label">Tickets Reserved</span>
          <span class="ticket-value">${options.ticketNumbers.length}</span>
        </div>
      </div>
      <div class="info-box">
        <div class="info-box-title">📧 Next Steps</div>
        <div class="info-box-text">
          Please complete your payment to secure your tickets. Your reserved tickets will be 
          confirmed once payment is processed.
        </div>
      </div>
      <div style="text-align: center;">
        <a href="${orderUrl}" class="button">View Order Details</a>
      </div>
    `;

    return this.getBaseTemplate(content, 'Order Confirmation');
  }

  /**
   * Payment Success Template
   */
  getPaymentSuccessEmail(
    options: EmailTemplateOptions & {
      orderNumber: string;
      competitionTitle: string;
      ticketNumbers: number[];
      amountGBP: string;
      orderId: string;
    }
  ): string {
    const firstName = options.firstName || 'Valued Customer';
    const ticketsUrl = 'https://www.royalcompetitions.co.uk/my-tickets';
    const orderUrl = 'https://www.royalcompetitions.co.uk/profile/orders';

    const ticketListItems = options.ticketNumbers
      .map(
        (num) => `
      <div class="ticket-item">
        <span class="ticket-label">Ticket #${num}</span>
        <span class="ticket-value" style="color: #e3b03e;">✓ Active</span>
      </div>
    `
      )
      .join('');

    const content = `
      <h1 class="content-title">🎉 Payment Successful!</h1>
      <p class="content-text">
        Hello ${firstName},
      </p>
      <p class="content-text">
        Great news! Your payment has been successfully processed and your tickets for 
        <span class="highlight">${options.competitionTitle}</span> are now confirmed.
      </p>
      <div class="ticket-details">
        <div class="ticket-item">
          <span class="ticket-label">Order Number</span>
          <span class="ticket-value">${options.orderNumber}</span>
        </div>
        <div class="ticket-item">
          <span class="ticket-label">Competition</span>
          <span class="ticket-value">${options.competitionTitle}</span>
        </div>
        <div class="ticket-item">
          <span class="ticket-label">Amount Paid</span>
          <span class="ticket-value" style="color: #e3b03e;">£${options.amountGBP}</span>
        </div>
        <div class="ticket-item">
          <span class="ticket-label">Tickets Confirmed</span>
          <span class="ticket-value">${options.ticketNumbers.length}</span>
        </div>
        ${ticketListItems}
      </div>
      <div class="info-box" style="background: linear-gradient(135deg, #ffe998 0%, #f5cb86 100%); border-left-color: #e3b03e;">
        <div class="info-box-title" style="color: #101e2e;">✨ You're All Set!</div>
        <div class="info-box-text" style="color: #101e2e;">
          Your tickets are now active and you're officially entered into the competition. 
          Good luck!
        </div>
      </div>
      <div style="text-align: center; margin-top: 30px;">
        <a href="${ticketsUrl}" class="button">View My Tickets</a>
        <a href="${orderUrl}" class="button button-secondary" style="margin-left: 15px;">View Order</a>
      </div>
    `;

    return this.getBaseTemplate(content, 'Payment Successful');
  }

  /**
   * Winner Notification Template
   */
  getWinnerNotificationEmail(
    options: EmailTemplateOptions & {
      competitionTitle: string;
      ticketNumber: number;
      prize: string;
      drawDate: string;
      claimUrl: string;
    }
  ): string {
    const firstName = options.firstName || 'Valued Customer';

    const content = `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 72px; margin-bottom: 20px;">🏆</div>
        <h1 class="content-title" style="color: #e3b03e; font-size: 36px;">
          CONGRATULATIONS!
        </h1>
      </div>
      <p class="content-text" style="font-size: 20px; font-weight: 600; text-align: center; color: #e3b03e;">
        You're a Winner!
      </p>
      <p class="content-text">
        Hello ${firstName},
      </p>
      <p class="content-text">
        We're absolutely thrilled to inform you that <strong>Ticket #${options.ticketNumber}</strong> 
        has been selected as the winner in the 
        <span class="highlight">${options.competitionTitle}</span> competition!
      </p>
      <div class="ticket-details" style="background: linear-gradient(135deg, #ffe998 0%, #f5cb86 100%); border: 2px solid #e3b03e;">
        <div class="ticket-item">
          <span class="ticket-label">Competition</span>
          <span class="ticket-value">${options.competitionTitle}</span>
        </div>
        <div class="ticket-item">
          <span class="ticket-label">Winning Ticket</span>
          <span class="ticket-value" style="color: #e3b03e; font-size: 20px; font-weight: 700;">#${options.ticketNumber}</span>
        </div>
        <div class="ticket-item">
          <span class="ticket-label">Prize</span>
          <span class="ticket-value" style="color: #101e2e; font-size: 18px; font-weight: 700;">${options.prize}</span>
        </div>
        <div class="ticket-item">
          <span class="ticket-label">Draw Date</span>
          <span class="ticket-value">${new Date(
            options.drawDate
          ).toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}</span>
        </div>
      </div>
      <div class="info-box" style="background: linear-gradient(135deg, #ffe998 0%, #f5cb86 100%); border-left-color: #e3b03e;">
        <div class="info-box-title" style="color: #101e2e;">🎁 Claim Your Prize</div>
        <div class="info-box-text" style="color: #101e2e;">
          To claim your prize, please click the button below and complete the claim process. 
          Our team will be in touch shortly to arrange delivery.
        </div>
      </div>
      <div style="text-align: center;">
        <a href="${options.claimUrl}" class="button" style="font-size: 18px; padding: 18px 50px;">
          Claim Your Prize
        </a>
      </div>
      <p class="content-text" style="color: #7e5936; font-size: 14px; margin-top: 30px; text-align: center;">
        This is an official notification from Royal Competitions. 
        Please keep this email for your records.
      </p>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e3b03e; text-align: center; font-size: 12px; color: #7e5936;">
        <p style="margin: 5px 0;">
          <strong>Royal Competitions</strong><br>
          Official Winner Notification
        </p>
        <p style="margin: 5px 0; font-size: 11px;">
          If you have any questions, please contact our support team.
        </p>
      </div>
    `;

    return this.getBaseTemplate(content, "You're a Winner!");
  }

  /**
   * Draw Completed Template
   */
  getDrawCompletedEmail(
    options: EmailTemplateOptions & {
      competitionTitle: string;
      drawDate: string;
      winnerTicketNumber: number;
      competitionUrl: string;
    }
  ): string {
    const firstName = options.firstName || 'Valued Customer';
    const drawsUrl = 'https://www.royalcompetitions.co.uk/draws';

    const content = `
      <h1 class="content-title">Draw Completed</h1>
      <p class="content-text">
        Hello ${firstName},
      </p>
      <p class="content-text">
        The draw for <span class="highlight">${options.competitionTitle}</span> has been completed!
      </p>
      <div class="ticket-details">
        <div class="ticket-item">
          <span class="ticket-label">Competition</span>
          <span class="ticket-value">${options.competitionTitle}</span>
        </div>
        <div class="ticket-item">
          <span class="ticket-label">Draw Date</span>
          <span class="ticket-value">${new Date(
            options.drawDate
          ).toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}</span>
        </div>
        <div class="ticket-item">
          <span class="ticket-label">Winning Ticket</span>
          <span class="ticket-value" style="color: #e3b03e; font-weight: 700;">#${options.winnerTicketNumber}</span>
        </div>
      </div>
      <div class="info-box">
        <div class="info-box-title">📋 Results</div>
        <div class="info-box-text">
          The winner has been notified. If you didn't win this time, don't worry - 
          we have many more exciting competitions coming up!
        </div>
      </div>
      <div style="text-align: center;"></div>
        <a href="${drawsUrl}" class="button">View Competition Results</a>
      </div>
    `;

    return this.getBaseTemplate(content, 'Draw Completed');
  }

  /**
   * Order Refunded Template
   */
  getOrderRefundedEmail(
    options: EmailTemplateOptions & {
      orderNumber: string;
      competitionTitle: string;
      amountGBP: string;
      refundReason?: string;
    }
  ): string {
    const firstName = options.firstName || 'Valued Customer';

    const content = `
      <h1 class="content-title">Refund Processed</h1>
      <p class="content-text">
        Hello ${firstName},
      </p>
      <p class="content-text">
        We've processed a refund for your order <strong>${options.orderNumber}</strong> 
        for the competition <span class="highlight">${options.competitionTitle}</span>.
      </p>
      <div class="ticket-details">
        <div class="ticket-item">
          <span class="ticket-label">Order Number</span>
          <span class="ticket-value">${options.orderNumber}</span>
        </div>
        <div class="ticket-item">
          <span class="ticket-label">Competition</span>
          <span class="ticket-value">${options.competitionTitle}</span>
        </div>
        <div class="ticket-item">
          <span class="ticket-label">Refund Amount</span>
          <span class="ticket-value" style="color: #e3b03e;">£${options.amountGBP}</span>
        </div>
        ${
          options.refundReason
            ? `
        <div class="ticket-item">
          <span class="ticket-label">Reason</span>
          <span class="ticket-value">${options.refundReason}</span>
        </div>
        `
            : ''
        }
      </div>
      <div class="info-box">
        <div class="info-box-title">💳 Refund Details</div>
        <div class="info-box-text">
          The refund has been processed and should appear in your account within 5-10 business days, 
          depending on your payment method. If you have any questions, please contact our support team.
        </div>
      </div>
    `;

    return this.getBaseTemplate(content, 'Refund Processed');
  }

  /**
   * Competition Closed Template
   */
  getCompetitionClosedEmail(
    options: EmailTemplateOptions & {
      competitionTitle: string;
      competitionUrl: string;
    }
  ): string {
    const firstName = options.firstName || 'Valued Customer';
    const drawsUrl = 'https://www.royalcompetitions.co.uk/draws';

    const content = `
      <h1 class="content-title">Competition Closed</h1>
      <p class="content-text">
        Hello ${firstName},
      </p>
      <p class="content-text">
        The competition <span class="highlight">${options.competitionTitle}</span> has been closed 
        and is no longer accepting entries.
      </p>
      <div class="info-box">
        <div class="info-box-title">📅 What's Next?</div>
        <div class="info-box-text">
          The draw will be conducted soon. Stay tuned for the results! 
          In the meantime, check out our other exciting competitions.
        </div>
      </div>
      <div style="text-align: center;">
        <a href="${drawsUrl}" class="button">View Draws</a>
      </div>
    `;

    return this.getBaseTemplate(content, 'Competition Closed');
  }
}

const emailTemplatesService = new EmailTemplatesService();
export default emailTemplatesService;
