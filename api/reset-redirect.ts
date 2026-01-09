// api/reset-redirect.ts
// Web redirect page that opens the app via deep link
// This works because email clients allow https:// links

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { oobCode, expiresAt } = req.query;

  if (!oobCode) {
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

  // Create deep link
  const deepLink = `defenduapp://resetpassword?oobCode=${oobCode}${expiresAt ? `&expiresAt=${expiresAt}` : ''}`;
  
  // HTML page that tries to open the app and shows fallback
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Opening Defendu App...</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="refresh" content="2;url=${deepLink}">
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px;
            background: linear-gradient(135deg, #041527 0%, #00AABB 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
          .container {
            background: white;
            color: #333;
            padding: 40px;
            border-radius: 20px;
            max-width: 500px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          }
          h1 {
            color: #00AABB;
            margin-bottom: 20px;
          }
          .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #00AABB;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .button {
            background-color: #00AABB;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 25px;
            display: inline-block;
            margin-top: 20px;
            font-weight: bold;
          }
          .button:hover {
            background-color: #0088aa;
          }
          .fallback {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 14px;
            color: #666;
          }
        </style>
        <script>
          // Try to open the app immediately
          window.location.href = "${deepLink}";
          
          // Fallback: If app doesn't open after 2 seconds, show instructions
          setTimeout(function() {
            document.getElementById('instructions').style.display = 'block';
          }, 2000);
        </script>
      </head>
      <body>
        <div class="container">
          <h1>Defendu</h1>
          <p>Opening the app...</p>
          <div class="spinner"></div>
          <p style="margin-top: 20px;">If the app doesn't open automatically, click the button below:</p>
          <a href="${deepLink}" class="button">Open in Defendu App</a>
          <div id="instructions" class="fallback" style="display: none;">
            <p><strong>Don't have the app?</strong></p>
            <p>If the app doesn't open, you may need to:</p>
            <ol style="text-align: left; max-width: 400px; margin: 0 auto;">
              <li>Make sure the Defendu app is installed</li>
              <li>Copy this link and paste it in your browser: <code style="font-size: 10px; word-break: break-all;">${deepLink}</code></li>
            </ol>
          </div>
        </div>
      </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}
