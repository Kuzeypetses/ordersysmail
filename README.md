# KuzeyPet Sipariş Sistemi - Cloudflare Pages

Bu sürüm ürünleri `data/urunler.xlsx` dosyasından okur, sipariş Excel'i oluşturur ve iki şekilde kullanılabilir:

- **Excel İndir:** Sipariş dosyasını kullanıcının cihazına indirir.
- **Mail Gönder:** Aynı Excel'i arka planda oluşturur, dosyayı Microsoft 365 üzerinden e-posta eki olarak gönderir.
- **Çıkış Yap:** Formu/siparişi temizler ve uygulamadan çıkar. Varsayılan olarak boş sayfaya yönlendirir. Kurumsal portal adresine dönmesi isteniyorsa `app.js` içindeki `EXIT_URL` değerini portal URL'si ile değiştirin.

## Yeni Satış Temsilcisi alanı

Müşteri kodunun üstünde **Satış Temsilcisi / Ad Soyad** alanı vardır. Bu alan zorunludur ve oluşturulan Excel'in içine de yazılır.

## Mail gönderimi

Gönderen adres varsayılan olarak:

`salesexcellencesystem@kuzeypet.com`

Alıcı adresi kod içine yazılmaz. Cloudflare Pages ortam değişkeni olarak tanımlanır; böylece gerektiğinde kodu değiştirmeden güncellenebilir.

### Gerekli Cloudflare Pages değişkenleri

Cloudflare Dashboard > Workers & Pages > ilgili proje > Settings > Variables and Secrets bölümüne şunları ekleyin:

- `TENANT_ID` = Microsoft 365 / Entra tenant ID
- `CLIENT_ID` = Entra App Registration Application (client) ID
- `CLIENT_SECRET` = Entra uygulama secret değeri (**Secret olarak kaydedin**)
- `ORDER_RECIPIENT` = siparişlerin gönderileceği sabit e-posta adresi
- `MAIL_SENDER` = `salesexcellencesystem@kuzeypet.com` (opsiyonel; yazılmazsa bu adres kullanılır)

Production ve Preview ortamlarında gerekiyorsa ayrı ayrı tanımlayın.

### Microsoft Entra / Graph yetkisi

1. Microsoft Entra Admin Center'da bir **App Registration** oluşturun.
2. API permissions altında Microsoft Graph > **Application permissions > Mail.Send** ekleyin.
3. **Grant admin consent** uygulayın.
4. Certificates & secrets bölümünden bir Client Secret oluşturun ve değerini Cloudflare'daki `CLIENT_SECRET` secret'ına yazın.
5. Uygulamanın yalnızca `salesexcellencesystem@kuzeypet.com` posta kutusundan mail gönderebilmesi için Exchange Online tarafında uygulama erişimini bu mailbox ile sınırlandırmanız önerilir.

> Güvenlik: Microsoft 365 şifresi veya Client Secret hiçbir zaman `index.html` / `app.js` içine yazılmamalıdır. Mail işlemi `functions/api/send-order.js` içindeki Cloudflare Pages Function üzerinden yapılır.

## Yayın

- Framework preset: None
- Build command: boş
- Build output directory: `/` veya root
- `functions/` klasörü proje kökünde kalmalıdır.

GitHub'a bu paketin içeriğini yükleyip Cloudflare Pages deployment yaptığınızda `/api/send-order` fonksiyonu otomatik yayınlanır.

## Ürün listesi

`data/urunler.xlsx` dosyasını aynı kolon yapısıyla güncellerseniz sistem yeni ürünleri okur. Dosyaya erişilemezse `embedded-products.js` içindeki gömülü kopya kullanılabilir.
