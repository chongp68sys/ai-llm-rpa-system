import nodemailer from 'nodemailer';
import { config } from '../../config/environment.js';

export class EmailProcessor {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    if (!config.email?.enabled) {
      console.warn('Email processor initialized but email service is not configured');
      return;
    }

    this.transporter = nodemailer.createTransporter({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.password
      }
    });
  }

  async process(data) {
    const { recipients, subject, content, nodeId, executionId } = data;

    if (!this.transporter) {
      throw new Error('Email service not configured. Please set email configuration in environment variables.');
    }

    try {
      // Ensure recipients is an array
      const recipientList = Array.isArray(recipients) ? recipients : [recipients];
      
      const mailOptions = {
        from: config.email.from || config.email.user,
        to: recipientList.join(', '),
        subject: subject || 'Workflow Notification',
        text: typeof content === 'string' ? content : JSON.stringify(content),
        html: this.generateHtmlContent(content, subject, executionId)
      };

      const info = await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: info.messageId,
        recipients: recipientList,
        subject,
        timestamp: new Date().toISOString(),
        nodeId,
        executionId
      };
    } catch (error) {
      console.error(`Failed to send email for execution ${executionId}:`, error);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  generateHtmlContent(content, subject, executionId) {
    const textContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject || 'Workflow Notification'}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .content { background-color: #white; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          pre { background-color: #f8f8f8; padding: 10px; border-radius: 3px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${subject || 'Workflow Notification'}</h2>
          <p><strong>Execution ID:</strong> ${executionId}</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        </div>
        <div class="content">
          <pre>${textContent}</pre>
        </div>
        <div class="footer">
          <p>This email was sent automatically by the AI LLM RPA System.</p>
        </div>
      </body>
      </html>
    `;
  }

  async testConnection() {
    if (!this.transporter) {
      throw new Error('Email transporter not configured');
    }

    try {
      await this.transporter.verify();
      return { status: 'connected', timestamp: new Date().toISOString() };
    } catch (error) {
      return { status: 'failed', error: error.message, timestamp: new Date().toISOString() };
    }
  }
}