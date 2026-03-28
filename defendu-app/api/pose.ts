// POST /api/pose — developer pose-estimation ticket (Mailjet)
// CORS headers match create-payment so Expo web preflight succeeds.

import type { VercelRequest, VercelResponse } from '@vercel/node';

const DEFAULT_DEVELOPER_EMAIL = 'mikelaboyme@gmail.com';
const MAX_LEN = {
  moduleTitle: 500,
  description: 8000,
  category: 200,
  trainerName: 200,
  videoUrl: 4000,
  extractCommand: 4000,
  outputPath: 500,
  moduleId: 200,
  referenceCode: 50,
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function clip(s: string, max: number): string {
  if (!s || typeof s !== 'string') return '';
  return s.length <= max ? s : s.slice(0, max) + '…';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    const moduleId = clip(String(body.moduleId ?? ''), MAX_LEN.moduleId);
    const referenceCode = clip(String(body.referenceCode ?? ''), MAX_LEN.referenceCode);
    const moduleTitle = clip(String(body.moduleTitle ?? ''), MAX_LEN.moduleTitle);
    const description = clip(String(body.description ?? ''), MAX_LEN.description);
    const category = clip(String(body.category ?? ''), MAX_LEN.category);
    const trainerName = clip(String(body.trainerName ?? ''), MAX_LEN.trainerName);
    const status = clip(String(body.status ?? ''), MAX_LEN.category);
    const videoUrl = clip(String(body.videoUrl ?? ''), MAX_LEN.videoUrl);
    const extractCommand = clip(String(body.extractCommand ?? ''), MAX_LEN.extractCommand);
    const outputPath = clip(String(body.outputPath ?? ''), MAX_LEN.outputPath);
    const createdAtLabel = clip(String(body.createdAtLabel ?? ''), 100);
    const submittedAtLabel = clip(String(body.submittedAtLabel ?? ''), 100);

    if (!moduleId || !referenceCode || !moduleTitle || !videoUrl || !extractCommand) {
      return res.status(400).json({
        error: 'Missing required fields: moduleId, referenceCode, moduleTitle, videoUrl, extractCommand',
      });
    }

    if (!/^https?:\/\//i.test(videoUrl)) {
      return res.status(400).json({ error: 'videoUrl must be an http(s) URL' });
    }

    const mailjetApiKey = process.env.MAILJET_API_KEY;
    const mailjetApiSecret = process.env.MAILJET_API_SECRET;
    const mailjetFromEmail = process.env.MAILJET_FROM_EMAIL || 'noreply@defendu.com';
    const mailjetFromName = process.env.MAILJET_FROM_NAME || 'Defendu';
    const developerEmail =
      process.env.MAILJET_POSE_DEVELOPER_EMAIL || DEFAULT_DEVELOPER_EMAIL;

    if (!mailjetApiKey || !mailjetApiSecret) {
      console.error('Mailjet credentials missing for /api/pose');
      return res.status(500).json({
        error: 'Email service is not configured',
      });
    }

    const ticketSubmittedAt = new Date().toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    const subject = `[Defendu] Pose estimation request — ${referenceCode} — ${moduleTitle}`;

    const intro = `Dear Development Team,

An administrator has submitted a formal request to add or extend pose estimation capabilities for the Defendu training module summarized below. Please treat this message as a work ticket: use the technique video URL and the local extractor command (run from the pose-data-extractor project on a development machine) as the primary inputs to scope and implement pose estimation for this module in the app.

If anything is unclear, reply to the product or admin team for clarification.

Kind regards,
Defendu Admin`;

    const detailBlock = `
Module reference code: ${referenceCode}
Internal module ID: ${moduleId}
Title: ${moduleTitle}
Category: ${category || 'N/A'}
Trainer: ${trainerName || 'N/A'}
Current module status: ${status || 'N/A'}

Description:
${description || '(No description provided)'}

Date module created: ${createdAtLabel || 'N/A'}
Date originally submitted for review: ${submittedAtLabel || 'N/A'}
Date this ticket was submitted: ${ticketSubmittedAt}

Technique video URL:
${videoUrl}

Recommended local extract command (pose-data-extractor folder):
${extractCommand}

Expected CSV output path:
${outputPath || 'N/A'}
`;

    const textPart = `${intro}

---

${detailBlock}`;

    const e = (t: string) => escapeHtml(t);
    const introParagraphs = intro
      .split(/\n\n+/)
      .map((p) => `<p style="margin: 12px 0;">${e(p).replace(/\n/g, '<br/>')}</p>`)
      .join('');
    const htmlPart = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 720px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #041527; padding: 24px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #00AABB; margin: 0; font-size: 20px;">Defendu — Developer ticket</h1>
    <p style="color: #ccc; margin: 8px 0 0; font-size: 14px;">Pose estimation feature request</p>
  </div>
  <div style="background-color: #f9f9f9; padding: 28px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
    ${introParagraphs}
    <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;" />
    <h2 style="color: #041527; font-size: 16px; margin-top: 0;">Module details</h2>
    <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
      <tr><td style="padding: 6px 0; color: #555; width: 200px;">Reference code</td><td style="padding: 6px 0;"><strong>${e(referenceCode)}</strong></td></tr>
      <tr><td style="padding: 6px 0; color: #555;">Module ID</td><td style="padding: 6px 0;">${e(moduleId)}</td></tr>
      <tr><td style="padding: 6px 0; color: #555;">Title</td><td style="padding: 6px 0;">${e(moduleTitle)}</td></tr>
      <tr><td style="padding: 6px 0; color: #555;">Category</td><td style="padding: 6px 0;">${e(category || 'N/A')}</td></tr>
      <tr><td style="padding: 6px 0; color: #555;">Trainer</td><td style="padding: 6px 0;">${e(trainerName || 'N/A')}</td></tr>
      <tr><td style="padding: 6px 0; color: #555;">Module status</td><td style="padding: 6px 0;">${e(status || 'N/A')}</td></tr>
      <tr><td style="padding: 6px 0; color: #555; vertical-align: top;">Description</td><td style="padding: 6px 0; white-space: pre-wrap;">${e(description || '(No description provided)')}</td></tr>
      <tr><td style="padding: 6px 0; color: #555;">Date created</td><td style="padding: 6px 0;">${e(createdAtLabel || 'N/A')}</td></tr>
      <tr><td style="padding: 6px 0; color: #555;">Date submitted (review)</td><td style="padding: 6px 0;">${e(submittedAtLabel || 'N/A')}</td></tr>
      <tr><td style="padding: 6px 0; color: #555;">Date ticket submitted</td><td style="padding: 6px 0;">${e(ticketSubmittedAt)}</td></tr>
    </table>
    <h2 style="color: #041527; font-size: 16px; margin-top: 24px;">Technique video</h2>
    <p style="word-break: break-all; font-size: 13px; background: #fff; padding: 12px; border-radius: 8px; border: 1px solid #ddd;"><a href="${escapeAttr(videoUrl)}" style="color: #00AABB;">${e(videoUrl)}</a></p>
    <h2 style="color: #041527; font-size: 16px;">Extract command</h2>
    <pre style="background: #0d1117; color: #e6edf3; padding: 14px; border-radius: 8px; font-size: 12px; overflow-x: auto; white-space: pre-wrap;">${e(extractCommand)}</pre>
    <p style="font-size: 14px;"><strong>Expected CSV path:</strong> ${e(outputPath || 'N/A')}</p>
  </div>
</body>
</html>`;

    const emailData = {
      Messages: [
        {
          From: {
            Email: mailjetFromEmail,
            Name: mailjetFromName,
          },
          To: [{ Email: developerEmail, Name: 'Defendu Development' }],
          Subject: subject,
          TextPart: textPart,
          HTMLPart: htmlPart,
        },
      ],
    };

    const authHeader = Buffer.from(`${mailjetApiKey}:${mailjetApiSecret}`).toString('base64');
    const mailjetResponse = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${authHeader}`,
      },
      body: JSON.stringify(emailData),
    });

    if (!mailjetResponse.ok) {
      const errorData = await mailjetResponse.json().catch(() => ({}));
      console.error('Mailjet pose ticket error:', errorData);
      return res.status(502).json({ error: 'Failed to send email' });
    }

    return res.status(200).json({
      success: true,
      message: 'Developer ticket sent successfully',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('api/pose error:', message);
    return res.status(500).json({ error: 'Failed to submit ticket', message });
  }
}
