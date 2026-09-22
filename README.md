# KuzeyPet Sipariş Sistemi - Brevo / Cloudflare V3

Bu sürüm ürünleri `data/urunler.xlsx` dosyasından okur, sipariş Excel'ini oluşturur ve iki şekilde kullanılabilir:

- **Excel İndir:** Sipariş dosyasını kullanıcının cihazına indirir.
- **Mail Gönder:** Aynı Excel'i arka planda oluşturur ve Brevo Transactional Email API üzerinden e-posta eki olarak gönderir.
- **Çıkış Yap:** Formu/siparişi temizler ve uygulamadan çıkar. Varsayılan olarak boş sayfaya yönlendirir. Kurumsal portal adresine dönmesi isteniyorsa `app.js` içindeki `EXIT_URL` değerini değiştirin.

## Form alanları

- **Satış Temsilcisi / Ad Soyad:** Zorunludur. Excel dosyasına eklenir ve mail konu başlığında kullanılır.
- **Müşteri Kodu:** Zorunludur.
- **Müşteri Ünvanı:** Opsiyoneldir.
- **E-posta Adresi:** Mailin gönderileceği alıcı adresidir. Kullanıcı her siparişte sayfadan girer.

Mail konu örneği:

`KuzeyPet Sipariş - Ahmet Yılmaz - B320 - Örnek Petshop`

## Cloudflare Variables and Secrets

Cloudflare Dashboard > Workers & Pages > ilgili proje > Settings > Variables and Secrets bölümünde:

- `BREVO_API_KEY` = Brevo API Key (**Secret** olarak kaydedin)
- `MAIL_FROM` = `salesexcellencesystem@kuzeypet.com`
- `MAIL_FROM_NAME` = `KuzeyPet Sales Excellence System`

`ORDER_RECIPIENT`, `TENANT_ID`, `CLIENT_ID` ve `CLIENT_SECRET` artık kullanılmaz.

> Güvenlik: Brevo API key hiçbir zaman `index.html` veya `app.js` içine yazılmamalıdır. API key yalnızca Cloudflare Secret olarak tutulur.

## Brevo tarafı

Brevo'da `salesexcellencesystem@kuzeypet.com` gönderen adresinin doğrulanmış olması gerekir. Worker, `POST https://api.brevo.com/v3/smtp/email` üzerinden mail gönderir ve oluşturulan `.xlsx` dosyasını base64 attachment olarak ekler.

## GitHub / Cloudflare yayın

Bu paketin **ordersys-main klasörünün içeriğini** GitHub repository'nizin köküne yükleyin. Özellikle aşağıdaki dizin yapısı korunmalıdır:

- `index.html`
- `app.js`
- `functions/api/send-order.js`
- `data/urunler.xlsx`
- diğer mevcut asset dosyaları

Cloudflare GitHub commit'ini deploy ettikten sonra `/api/send-order` endpoint'i yeni Brevo sürümüyle çalışır.

## Hızlı test

1. Siteyi Cloudflare URL'sinden açın.
2. Satış temsilcisi, müşteri kodu ve **E-posta Adresi** alanlarını doldurun.
3. En az bir ürüne adet girin.
4. **Mail Gönder** butonuna basın.
5. Başarılıysa `Sipariş Excel eki ile mail olarak gönderildi.` mesajı görünür.

Gönderim hata verirse Cloudflare Worker loglarında `Brevo send email error` satırını kontrol edin.
