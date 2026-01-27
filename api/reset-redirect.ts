// api/reset-redirect.ts
// Web redirect page that opens the app via deep link
// This works because email clients allow https:// links

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

  // Create deep link with custom token (not OOB code)
  const deepLink = `defenduapp://resetpassword?token=${token}${expiresAt ? `&expiresAt=${expiresAt}` : ''}`;
  
  // Web app URL for desktop/PC - use WEB_APP_URL if set, otherwise use API_BASE_URL, or default to localhost for dev
  const apiBaseUrl = process.env.API_BASE_URL || 'https://defendu-app.vercel.app';
  // Remove /api from API_BASE_URL if present to get the base domain
  const baseUrl = apiBaseUrl.replace(/\/api\/?$/, '');
  const webAppUrl = process.env.WEB_APP_URL || baseUrl || 'http://localhost:8081';
  const webAppLink = `${webAppUrl}/resetpassword?token=${token}${expiresAt ? `&expiresAt=${expiresAt}` : ''}`;
  
  // HTML page that tries to open the app and shows fallback
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Opening Defendu App...</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <script>
          // Immediate redirect detection - run before DOM loads
          (function() {
            try {
              const userAgent = navigator.userAgent || navigator.vendor || window.opera;
              const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
              const isAndroid = /android/i.test(userAgent);
              const isMobile = isIOS || isAndroid;
              const isWeb = !isMobile;
              
              if (isWeb) {
                // For web, redirect immediately
                const webLink = '${webAppLink}';
                console.log('Web detected, redirecting to:', webLink);
                // Use replace to prevent back navigation
                if (window.location.replace) {
                  window.location.replace(webLink);
                } else {
                  window.location.href = webLink;
                }
              }
            } catch (e) {
              console.error('Redirect error:', e);
            }
          })();
        </script>
        <noscript>
          <meta http-equiv="refresh" content="0;url=${webAppLink}">
        </noscript>
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
          .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #000C17;
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
          .button:active {
            background-color: #000a14;
          }
          .fallback {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 14px;
            color: #666;
          }
          code {
            font-size: 10px;
            word-break: break-all;
            background: #f5f5f5;
            padding: 5px;
            border-radius: 4px;
            display: block;
            margin-top: 10px;
          }
        </style>
        <script>
          (function() {
            const deepLink = "${deepLink}";
            const webLink = '${webAppLink}';
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;
            const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
            const isAndroid = /android/i.test(userAgent);
            const isMobile = isIOS || isAndroid;
            // Check if it's a web browser (not mobile)
            const isWeb = !isMobile;
            
            console.log('Device detected:', { isIOS, isAndroid, isMobile, isWeb });
            
            // Function to try opening the app
            function tryOpenApp() {
              console.log('Attempting to open app with:', deepLink);
              
              // For iOS, try multiple methods
              if (isIOS) {
                // Method 1: Direct location change
                window.location.href = deepLink;
                
                // Method 2: Create hidden iframe (iOS sometimes blocks direct redirects)
                setTimeout(function() {
                  const iframe = document.createElement('iframe');
                  iframe.style.display = 'none';
                  iframe.src = deepLink;
                  document.body.appendChild(iframe);
                  
                  // Remove iframe after a moment
                  setTimeout(function() {
                    document.body.removeChild(iframe);
                  }, 2000);
                }, 500);
                
                // Method 3: Fallback after delay
                setTimeout(function() {
                  showFallback();
                }, 2500);
              } 
              // For Android
              else if (isAndroid) {
                // Try direct redirect
                window.location.href = deepLink;
                
                // Fallback after delay
                setTimeout(function() {
                  showFallback();
                }, 2000);
              }
            }
            
            function showFallback() {
              const instructions = document.getElementById('instructions');
              if (instructions) {
                instructions.style.display = 'block';
              }
            }
            
            // Handle web browsers - automatically redirect to web app
            if (isWeb) {
              console.log('Web browser detected - automatically redirecting to web app:', webLink);
              // Use replace instead of href to prevent back navigation
              window.location.replace(webLink);
            } else {
              // For mobile, try to open the app
              tryOpenApp();
            }
            
            // Also handle button click for mobile fallback
            document.addEventListener('DOMContentLoaded', function() {
              const button = document.querySelector('.button');
              if (button) {
                button.addEventListener('click', function(e) {
                  e.preventDefault();
                  if (isMobile) {
                    window.location.href = deepLink;
                    // Show instructions after click
                    setTimeout(function() {
                      showFallback();
                    }, 1000);
                  } else {
                    // If somehow on web and button is clicked, redirect to web app
                    window.location.href = webLink;
                  }
                });
              }
            });
          })();
        </script>
      </head>
      <body>
        <div class="container">
          <h1>Defendu</h1>
          <p>Opening the app...</p>
          <div class="spinner"></div>
          <p style="margin-top: 20px;">If the app doesn't open automatically, click the button below:</p>
          <a href="${deepLink}" class="button" id="openButton">Open in Defendu App</a>
          <div id="instructions" class="fallback" style="display: none;">
            <p><strong>App didn't open?</strong></p>
            <p>Try these steps:</p>
            <ol style="text-align: left; max-width: 400px; margin: 10px auto;">
              <li><strong>On Mobile:</strong> Make sure the Defendu app is installed, then click the button above</li>
              <li><strong>On PC/Web:</strong> <a href="${webAppLink}" style="color: #000C17; text-decoration: underline;">Click here to open in web browser</a></li>
              <li>Or copy and paste this link in your browser:</li>
            </ol>
            <code id="linkToCopy">${webAppLink}</code>
            <p style="margin-top: 20px; font-size: 12px; color: #999;">
              <strong>Note:</strong> Deep links only work on mobile devices. On PC, use the web version link above.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}
