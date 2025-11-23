import nodemailer from 'nodemailer';
import { config } from '../config/environment';
import logger from '../utils/logger';
import emailTemplatesService from './emailTemplates.service';

/**
 * Email service using Nodemailer
 * Integrates with luxury email templates
 * Supports separate SMTP credentials for noreply and info emails
 */
class EmailService {
  private noreplyTransporter: nodemailer.Transporter;
  private infoTransporter: nodemailer.Transporter;

  constructor() {
    // Create transporter for noreply emails
    this.noreplyTransporter = nodemailer.createTransport({
      service: config.email.service,
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465, // true for 465, false for other ports
      auth: {
        user: config.email.noreply.user,
        pass: config.email.noreply.password,
      },
    });

    // Create transporter for info emails
    this.infoTransporter = nodemailer.createTransport({
      service: config.email.service,
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465, // true for 465, false for other ports
      auth: {
        user: config.email.info.user,
        pass: config.email.info.password,
      },
    });

    // Verify connections
    this.verifyConnections();
  }

  /**
   * Verify email connections
   */
  private async verifyConnections(): Promise<void> {
    try {
      await this.noreplyTransporter.verify();
      logger.info('Noreply email service connected successfully');
    } catch (error) {
      logger.error('Noreply email service connection failed:', error);
    }

    try {
      await this.infoTransporter.verify();
      logger.info('Info email service connected successfully');
    } catch (error) {
      logger.error('Info email service connection failed:', error);
    }
  }

  /**
   * Send email with specified transporter
   */
  private async sendEmailWithTransporter(
    transporter: nodemailer.Transporter,
    options: {
      to: string;
      subject: string;
      html: string;
      text?: string;
      from: string;
      fromName: string;
      replyTo?: string;
    }
  ): Promise<void> {
    try {
      // Extract domain from from email for List-Unsubscribe
      const fromDomain =
        options.from.split('@')[1] || 'royalcompetitions.co.uk';
      const unsubscribeUrl = `https://${fromDomain}/unsubscribe?email=${encodeURIComponent(options.to)}`;

      const mailOptions: nodemailer.SendMailOptions = {
        from: `"${options.fromName}" <${options.from}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.htmlToText(options.html),
        replyTo: options.replyTo || options.from,
        // Anti-spam headers
        headers: {
          'X-Mailer': 'Royal Competitions Email Service',
          'X-Priority': '1', // High priority for winner notifications
          Importance: 'high',
          Precedence: 'bulk',
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          'X-Auto-Response-Suppress': 'All',
          'Auto-Submitted': 'auto-generated',
          // SPF/DKIM/DMARC - these should be configured at domain level
          // But we can help by ensuring proper formatting
          'Message-ID': `<${Date.now()}-${Math.random().toString(36)}@${fromDomain}>`,
        },
        // Additional options for better deliverability
        priority: 'high' as const,
        date: new Date(),
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info(
        `Email sent successfully to ${options.to} from ${options.from}: ${info?.messageId || 'N/A'}`
      );
    } catch (error) {
      logger.error(`Failed to send email to ${options.to}:`, error);
      throw error;
    }
  }

  /**
   * Convert HTML to plain text (simple version)
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  /**
   * Send email verification email
   * Uses noreply@royalcompetitions.co.uk
   */
  async sendVerificationEmail(
    email: string,
    firstName: string,
    verificationToken: string
  ): Promise<void> {
    const html = emailTemplatesService.getVerificationEmail({
      firstName,
      verificationToken,
    });

    await this.sendEmailWithTransporter(this.noreplyTransporter, {
      to: email,
      subject: 'Verify Your Email Address - Royal Competitions',
      html,
      from: config.email.noreply.email,
      fromName: config.email.noreply.name,
    });
  }

  /**
   * Send password reset email
   * Uses noreply@royalcompetitions.co.uk
   */
  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    resetToken: string
  ): Promise<void> {
    const html = emailTemplatesService.getPasswordResetEmail({
      firstName,
      resetToken,
    });

    await this.sendEmailWithTransporter(this.noreplyTransporter, {
      to: email,
      subject: 'Reset Your Password - Royal Competitions',
      html,
      from: config.email.noreply.email,
      fromName: config.email.noreply.name,
    });
  }

  /**
   * Send order confirmation email
   * Uses info@royalcompetitions.co.uk
   */
  async sendOrderConfirmationEmail(options: {
    email: string;
    firstName: string;
    lastName?: string;
    orderNumber: string;
    competitionTitle: string;
    ticketNumbers: number[];
    amountGBP: string;
    orderId: string;
  }): Promise<void> {
    const html = emailTemplatesService.getOrderConfirmationEmail({
      firstName: options.firstName,
      lastName: options.lastName,
      orderNumber: options.orderNumber,
      competitionTitle: options.competitionTitle,
      ticketNumbers: options.ticketNumbers,
      amountGBP: options.amountGBP,
      orderId: options.orderId,
    });

    await this.sendEmailWithTransporter(this.infoTransporter, {
      to: options.email,
      subject: `Order Confirmation - ${options.orderNumber} - Royal Competitions`,
      html,
      from: config.email.info.email,
      fromName: config.email.info.name,
    });
  }

  /**
   * Send payment success email
   * Uses info@royalcompetitions.co.uk
   */
  async sendPaymentSuccessEmail(options: {
    email: string;
    firstName: string;
    lastName?: string;
    orderNumber: string;
    competitionTitle: string;
    ticketNumbers: number[];
    amountGBP: string;
    orderId: string;
  }): Promise<void> {
    const html = emailTemplatesService.getPaymentSuccessEmail({
      firstName: options.firstName,
      lastName: options.lastName,
      orderNumber: options.orderNumber,
      competitionTitle: options.competitionTitle,
      ticketNumbers: options.ticketNumbers,
      amountGBP: options.amountGBP,
      orderId: options.orderId,
    });

    await this.sendEmailWithTransporter(this.infoTransporter, {
      to: options.email,
      subject: `Payment Successful - ${options.orderNumber} - Royal Competitions`,
      html,
      from: config.email.info.email,
      fromName: config.email.info.name,
    });
  }

  /**
   * Send winner notification email
   * Uses info@royalcompetitions.co.uk
   */
  async sendWinnerNotificationEmail(options: {
    email: string;
    firstName: string;
    lastName?: string;
    competitionTitle: string;
    ticketNumber: number;
    prize: string;
    drawDate: string;
    claimUrl: string;
  }): Promise<void> {
    const html = emailTemplatesService.getWinnerNotificationEmail({
      firstName: options.firstName,
      lastName: options.lastName,
      competitionTitle: options.competitionTitle,
      ticketNumber: options.ticketNumber,
      prize: options.prize,
      drawDate: options.drawDate,
      claimUrl: options.claimUrl,
    });

    await this.sendEmailWithTransporter(this.infoTransporter, {
      to: options.email,
      subject: `🎉 You're a Winner! - ${options.competitionTitle} - Royal Competitions`,
      html,
      from: config.email.info.email,
      fromName: config.email.info.name,
      replyTo: config.email.info.email,
    });
  }

  /**
   * Send draw completed email
   * Uses info@royalcompetitions.co.uk
   */
  async sendDrawCompletedEmail(options: {
    email: string;
    firstName: string;
    lastName?: string;
    competitionTitle: string;
    drawDate: string;
    winnerTicketNumber: number;
    competitionUrl: string;
  }): Promise<void> {
    const html = emailTemplatesService.getDrawCompletedEmail({
      firstName: options.firstName,
      lastName: options.lastName,
      competitionTitle: options.competitionTitle,
      drawDate: options.drawDate,
      winnerTicketNumber: options.winnerTicketNumber,
      competitionUrl: options.competitionUrl,
    });

    await this.sendEmailWithTransporter(this.infoTransporter, {
      to: options.email,
      subject: `Draw Completed - ${options.competitionTitle} - Royal Competitions`,
      html,
      from: config.email.info.email,
      fromName: config.email.info.name,
    });
  }

  /**
   * Send order refunded email
   * Uses info@royalcompetitions.co.uk
   */
  async sendOrderRefundedEmail(options: {
    email: string;
    firstName: string;
    lastName?: string;
    orderNumber: string;
    competitionTitle: string;
    amountGBP: string;
    refundReason?: string;
  }): Promise<void> {
    const html = emailTemplatesService.getOrderRefundedEmail({
      firstName: options.firstName,
      lastName: options.lastName,
      orderNumber: options.orderNumber,
      competitionTitle: options.competitionTitle,
      amountGBP: options.amountGBP,
      refundReason: options.refundReason,
    });

    await this.sendEmailWithTransporter(this.infoTransporter, {
      to: options.email,
      subject: `Refund Processed - ${options.orderNumber} - Royal Competitions`,
      html,
      from: config.email.info.email,
      fromName: config.email.info.name,
    });
  }

  /**
   * Send competition closed email
   * Uses info@royalcompetitions.co.uk
   */
  async sendCompetitionClosedEmail(options: {
    email: string;
    firstName: string;
    lastName?: string;
    competitionTitle: string;
    competitionUrl: string;
  }): Promise<void> {
    const html = emailTemplatesService.getCompetitionClosedEmail({
      firstName: options.firstName,
      lastName: options.lastName,
      competitionTitle: options.competitionTitle,
      competitionUrl: options.competitionUrl,
    });

    await this.sendEmailWithTransporter(this.infoTransporter, {
      to: options.email,
      subject: `Competition Closed - ${options.competitionTitle} - Royal Competitions`,
      html,
      from: config.email.info.email,
      fromName: config.email.info.name,
    });
  }
}

const emailService = new EmailService();
export default emailService;
