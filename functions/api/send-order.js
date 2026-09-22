const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
});

export async function onRequestPost(context) {
  try {
    const { TENANT_ID, CLIENT_ID, CLIENT_SECRET, ORDER_RECIPIENT, MAIL_SENDER } = context.env;
    const sender = MAIL_SENDER || 'salesexcellencesystem@kuzeypet.com';

    if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET || !ORDER_RECIPIENT) {
      return json({ error: 'Mail servisi yapılandırması eksik. Cloudflare ortam değişkenlerini kontrol edin.' }, 500);
    }

    const body = await context.request.json();
    const salesRep = String(body.salesRep || '').trim();
    const customerCode = String(body.customerCode || '').trim();
    const customerTitle = String(body.customerTitle || '').trim();
    const fileName = String(body.fileName || '').trim();
    const fileBase64 = String(body.fileBase64 || '').trim();

    if (!salesRep || !customerCode || !fileName || !fileBase64) {
      return json({ error: 'Sipariş bilgileri eksik.' }, 400);
    }

    // Graph'ın basit ek sınırının altında kalması için koruma.
    if (fileBase64.length > 4_000_000) {
      return json({ error: 'Oluşan Excel dosyası mail eki için çok büyük.' }, 413);
    }

    const tokenRes = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(TENANT_ID)}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials'
      })
    });

    if (!tokenRes.ok) {
      const detail = await tokenRes.text();
      console.error('Graph token error', tokenRes.status, detail);
      return json({ error: 'Microsoft 365 bağlantısı kurulamadı.' }, 502);
    }

    const { access_token } = await tokenRes.json();
    const safeCode = customerCode.replace(/[<>]/g, '');
    const safeTitle = customerTitle.replace(/[<>]/g, '');
    const safeRep = salesRep.replace(/[<>]/g, '');

    const graphRes = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          subject: `KuzeyPet Sipariş - ${safeRep} - ${safeCode}${safeTitle ? ` - ${safeTitle}` : ''}`,
          body: {
            contentType: 'HTML',
            content: `<p>Merhaba,</p><p>Yeni sipariş formu ektedir.</p><p><strong>Satış Temsilcisi:</strong> ${safeRep}<br><strong>Müşteri Kodu:</strong> ${safeCode}<br><strong>Müşteri Ünvanı:</strong> ${safeTitle || '-'}</p><p>İyi çalışmalar.</p>`
          },
          toRecipients: [{ emailAddress: { address: ORDER_RECIPIENT } }],
          attachments: [{
            '@odata.type': '#microsoft.graph.fileAttachment',
            name: fileName,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            contentBytes: fileBase64
          }]
        },
        saveToSentItems: true
      })
    });

    if (!graphRes.ok) {
      const detail = await graphRes.text();
      console.error('Graph sendMail error', graphRes.status, detail);
      return json({ error: 'Microsoft 365 mail gönderimi başarısız oldu.' }, 502);
    }

    return json({ ok: true });
  } catch (error) {
    console.error('send-order error', error);
    return json({ error: 'Mail gönderimi sırasında beklenmeyen bir hata oluştu.' }, 500);
  }
}
