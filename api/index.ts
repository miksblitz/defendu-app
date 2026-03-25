import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).json({
    ok: true,
    name: 'Defendu API',
    message: 'Defendu backend is running.',
    endpoints: {
      createPayment: '/api/create-payment',
      paymentSuccess: '/api/payment-success',
      paymentCancel: '/api/payment-cancel',
      paymongoWebhook: '/api/paymongo-webhook',
      paymongoMonitor: '/api/paymongo-monitor',
    },
    timestamp: Date.now(),
  });
}
