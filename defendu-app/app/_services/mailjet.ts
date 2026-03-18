// services/mailjet.ts
// Mailjet email service for sending password reset emails
// NOTE: This file is for reference/documentation only.
// The actual Mailjet integration is in the backend API endpoints (api/password-reset.ts)
// This file should NOT be imported in client-side code.

export interface MailjetEmailOptions {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export class MailjetService {
  private static readonly API_BASE_URL = 'https://api.mailjet.com/v3.1';

  /**
   * Send password reset email via Mailjet
   * This should be called from a backend API endpoint, not directly from the client
   */
  static async sendPasswordResetEmail(
    email: string,
    resetLink: string,
    apiKey: string,
    apiSecret: string,
    fromEmail: string,
    fromName: string
  ): Promise<void> {
    const resetLinkWithExpiry = `${resetLink}&expiresIn=300`; // 5 minutes = 300 seconds

    const emailData = {
      Messages: [
        {
          From: {
            Email: fromEmail,
            Name: fromName,
          },
          To: [
            {
              Email: email,
            },
          ],
          Subject: 'Reset Your Password - Defendu',
          TextPart: `You requested a password reset. Click the link below to reset your password. This link will expire in 5 minutes.\n\n${resetLinkWithExpiry}\n\nIf you didn't request this, please ignore this email.`,
          HTMLPart: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #041527; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                  <h1 style="color: #00AABB; margin: 0;">Defendu</h1>
                </div>
                <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                  <h2 style="color: #041527;">Password Reset Request</h2>
                  <p>You requested to reset your password. Click the button below to create a new password. This link will expire in <strong>5 minutes</strong>.</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLinkWithExpiry}" 
                       style="background-color: #000C17; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">
                      Reset Password
                    </a>
                  </div>
                  <p style="font-size: 12px; color: #666;">Or copy and paste this link into your browser:</p>
                  <p style="font-size: 12px; color: #00AABB; word-break: break-all;">${resetLinkWithExpiry}</p>
                  <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                  <p style="font-size: 12px; color: #666;">If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
                </div>
              </body>
            </html>
          `,
        },
      ],
    };

    try {
      const response = await fetch(`${this.API_BASE_URL}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`,
        },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Mailjet API error: ${response.status} - ${errorData.ErrorMessage || response.statusText}`
        );
      }

      const result = await response.json();
      console.log('✅ Password reset email sent via Mailjet:', result);
    } catch (error: any) {
      console.error('❌ Error sending email via Mailjet:', error);
      throw new Error(`Failed to send password reset email: ${error.message}`);
    }
  }
}
