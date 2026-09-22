# KuzeyPet OrderSys Mail - V4

Bu sürüm Cloudflare Workers + Static Assets mimarisi için hazırlanmıştır.

## V4 değişiklikleri

- Ana formdaki E-posta Adresi alanı kaldırıldı.
- `Mail Gönder` tıklandığında alıcı adresinin girileceği modal pencere açılır.
- Excel dosyası arka planda oluşturulur ve Brevo Transactional Email API üzerinden ek olarak gönderilir.
- `/api/send-order` artık Pages Functions klasörüne bağlı değildir; doğrudan `worker.js` içindeki Worker route'udur.
- Statik site dosyaları `public/` klasöründen Cloudflare Workers Static Assets ile sunulur.

## Cloudflare Variables and Secrets

Aşağıdaki değerler Cloudflare Worker üzerinde tanımlı olmalıdır:

- `BREVO_API_KEY` -> Secret -> Brevo API Keys bölümünden oluşturulan `xkeysib-...` anahtar
- `MAIL_FROM` -> Variable -> `salesexcellencesystem@kuzeypet.com`
- `MAIL_FROM_NAME` -> Variable -> örn. `Rut Dışı Sipariş`

`ORDER_RECIPIENT` kullanılmaz. Alıcı adresi kullanıcı tarafından Mail Gönder penceresinde girilir.

## GitHub / Cloudflare deploy

Repo kökünde şu dosyalar bulunmalıdır:

- `worker.js`
- `wrangler.jsonc`
- `package.json`
- `public/`

Cloudflare Git build ayarında deploy komutu gerekiyorsa:

`npx wrangler deploy`

Build komutu gerekiyorsa boş bırakılabilir veya `npm install` kullanılabilir.

Cloudflare dashboard üzerindeki mevcut Variables and Secrets değerleri deploy sonrasında da Worker'a bağlı olmalıdır.

## Test

Deploy sonrası:

1. Siteyi açın.
2. Satış Temsilcisi, Müşteri Kodu ve sipariş miktarlarını girin.
3. `Mail Gönder` butonuna basın.
4. Açılan pencerede alıcı e-posta adresini yazın.
5. `Gönder` butonuna basın.
6. Başarılı durumda modal ve ekranda başarı mesajı görünür.

Hata olursa Cloudflare Observability loglarında `/api/send-order` isteği artık görünmelidir.
