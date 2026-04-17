// api/reset-redirect.ts
// Web-only redirect page for password reset links.

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { token, expiresAt } = req.query;

  if (!token) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invalid Reset Link</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>Invalid Reset Link</h1>
          <p>This password reset link is invalid or missing required parameters.</p>
        </body>
      </html>
    `);
  }

  // Check if link has expired
  if (expiresAt) {
    const expiryTime = parseInt(expiresAt as string, 10);
    if (Date.now() > expiryTime) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Link Expired</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>Link Expired</h1>
            <p>This password reset link has expired. Please request a new one.</p>
          </body>
        </html>
      `);
    }
  }

  // Hosted web app URL (required for web reset flow).
  const webAppUrl = process.env.WEB_APP_URL;
  const webAppLink = webAppUrl
    ? `${webAppUrl.replace(/\/$/, '')}/resetpassword?token=${token}${expiresAt ? `&expiresAt=${expiresAt}` : ''}`
    : '';

  if (webAppLink) {
    return res.redirect(302, webAppLink);
  }

  // WEB_APP_URL is not configured; show instructions.
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Reset Password</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 20px;
            background: linear-gradient(135deg, #041527 0%, #000C17 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            margin: 0;
          }
          .container {
            background: white;
            color: #333;
            padding: 40px;
            border-radius: 20px;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          }
          h1 {
            color: #000C17;
            margin-bottom: 20px;
          }
          .button {
            background-color: #000C17;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 25px;
            display: inline-block;
            margin-top: 20px;
            font-weight: bold;
            cursor: pointer;
          }
          .button:hover {
            background-color: #001a2e;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Defendu Reset Password</h1>
          <p>Web reset page is not configured yet.</p>
          <p style="margin-top: 20px;">Set <strong>WEB_APP_URL</strong> in your Vercel environment to your deployed web app domain.</p>
          <p style="margin-top: 24px;">Example:</p>
          <a class="button" href="https://your-web-domain.com/resetpassword?token=${token}${expiresAt ? `&expiresAt=${expiresAt}` : ''}">
            https://your-web-domain.com/resetpassword
          </a>
        </div>
      </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}
