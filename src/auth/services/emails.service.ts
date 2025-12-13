// email.service.ts
import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';
import { existsSync } from 'fs';
import { join } from 'path';
import * as pug from 'pug';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly templateDir = join(process.cwd(), 'src', 'templates');

  constructor(private readonly mailerService: MailerService) { }

  /**
   * Send email with HTML body wrapped in layout
   */
  // email.service.ts - Only update the sendEmail function
  async sendEmail(options: {
    to: string | string[];
    subject: string;
    html: string;
    context?: Record<string, any>;
  }): Promise<boolean> {
    try {
      // Merge provided context with defaults
      const emailContext = {
        companyName: 'Your Company',
        baseUrl: 'https://example.com',
        year: new Date().getFullYear(),
        contactEmail: 'contact@example.com',
        tagline: 'Making things better',
        content: options.html,
        ...options.context,
      };

      await this.mailerService.sendMail({
        to: options.to,
        subject: options.subject,
        template: 'layouts/base',
        context: emailContext,
      });

      this.logger.log(`Email sent to ${options.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }
  /*
  async sendPasswordResetEmail(
    email: string,
    username: string,
    resetUrl: string,
    options?: {
      subject?: string;
      companyName?: string;
      supportUrl?: string;
      ipAddress?: string;
      deviceInfo?: string;
    }
  ): Promise<boolean> {
    try {
      // Prepare context for the template
      const emailContext = {
        username,
        resetUrl,
        companyName: options?.companyName || 'Your Company',
        supportUrl: options?.supportUrl || 'https://example.com/support',
        subject: options?.subject || 'Reset Your Password',

      };

      const htmlBody = this.renderTemplate('layouts/reset-password.pug', emailContext);

      return this.sendEmail({
        to: email,
        subject: emailContext.subject,
        html: htmlBody,
        context: {
          companyName: emailContext.companyName,
          title: 'Password Reset Request',
          year: emailContext.year,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}:`, error);
      return false;
    }
  }
*/
  async sendTemplatedEmail(
    email: string,
    username: string,
    validationUrl: string,
    options?: {
      subject?: string;
      companyName?: string;
      supportUrl?: string;
    }
    , templatePath: string = 'layouts/email-validation.pug'
  ): Promise<boolean> {
    try {
      const emailContext = {
        username,
        validationUrl,
        companyName: options?.companyName || 'Your Company',
        supportUrl: options?.supportUrl || 'https://example.com/support',
        subject: options?.subject || 'Verify Your Email Address',
        year: new Date().getFullYear(),

      };

      const htmlBody = this.renderTemplate(templatePath, emailContext);

      return this.sendEmail({
        to: email,
        subject: emailContext.subject,
        html: htmlBody,
        context: {
          companyName: emailContext.companyName,
          title: 'Email Verification',
        },
      });
    } catch (error) {
      this.logger.error(`Failed to send validation email to ${email}:`, error);
      return false;
    }
  }

  private renderTemplate(templatePaht: string, context: any): string {
    try {
      const templatePath = join(this.templateDir, templatePaht);

      if (!existsSync(templatePath)) {
        this.logger.warn(`Template not found: ${templatePath}, using fallback`);

      }
      const compiledFunction = pug.compileFile(templatePath);
      return compiledFunction(context);
    } catch (error) {
      this.logger.error(`Failed to render email validation template:`, error);
      return ''
    }
  }


}