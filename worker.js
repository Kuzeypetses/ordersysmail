const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  }
});

const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[char]));

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

async function sendOrder(request, env) {
  try {
    const apiKey = String(env.BREVO_API_KEY || '').trim();
    const sender = String(env.MAIL_FROM || 'salesexcellencesystem@kuzeypet.com').trim();
    const senderName = String(env.MAIL_FROM_NAME || 'Rut Dışı Sipariş').trim();

    if (!apiKey) {
      return json({ error: 'BREVO_API_KEY Cloudflare Secret değeri tanımlı değil.' }, 500);
    }

    const body = await request.json();
    const salesRep = String(body.salesRep || '').trim();
    const customerCode = String(body.customerCode || '').trim();
    const customerTitle = String(body.customerTitle || '').trim();
    const recipientEmail = String(body.recipientEmail || '').trim().toLowerCase();
    const fileName = String(body.fileName || '').trim();
    const fileBase64 = String(body.fileBase64 || '').trim();

    if (!salesRep || !customerCode || !recipientEmail || !fileName || !fileBase64) {
      return json({ error: 'Sipariş veya e-posta bilgileri eksik.' }, 400);
    }
    if (!isValidEmail(recipientEmail)) {
      return json({ error: 'Geçerli bir alıcı e-posta adresi giriniz.' }, 400);
    }
    if (fileBase64.length > 12_000_000) {
      return json({ error: 'Oluşan Excel dosyası mail eki için çok büyük.' }, 413);
    }

    const safeRep = escapeHtml(salesRep);
    const safeCode = escapeHtml(customerCode);
    const safeTitle = escapeHtml(customerTitle);

    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: senderName, email: sender },
        to: [{ email: recipientEmail }],
        subject: `KuzeyPet Sipariş - ${salesRep} - ${customerCode}${customerTitle ? ` - ${customerTitle}` : ''}`,
        htmlContent: `<p>Merhaba,</p><p>Yeni sipariş formu ektedir.</p><p><strong>Satış Temsilcisi:</strong> ${safeRep}<br><strong>Müşteri Kodu:</strong> ${safeCode}<br><strong>Müşteri Ünvanı:</strong> ${safeTitle || '-'}</p><p>İyi çalışmalar.</p>`,
        attachment: [{ name: fileName, content: fileBase64 }]
      })
    });

    const raw = await brevoRes.text();
    let detail = null;
    try { detail = raw ? JSON.parse(raw) : {}; } catch (_e) { detail = raw; }

    if (!brevoRes.ok) {
      console.error('Brevo send email error', brevoRes.status, detail);
      const brevoMessage = detail && typeof detail === 'object' && detail.message ? ` ${detail.message}` : '';
      return json({ error: `Brevo mail gönderimi başarısız oldu.${brevoMessage}` }, 502);
    }

    return json({ ok: true, messageId: detail?.messageId || null });
  } catch (error) {
    console.error('send-order error', error);
    return json({ error: 'Mail gönderimi sırasında beklenmeyen bir hata oluştu.' }, 500);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/send-order') {
      if (request.method !== 'POST') {
        return json({ error: 'Method not allowed.' }, 405);
      }
      return sendOrder(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};
