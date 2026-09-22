const state = { products: [], grouped: new Map(), order: new Map(), lastFile: null, lastFileName: null };
const EXIT_URL = 'about:blank'; // Gerekirse şirket portalı URL'si ile değiştirin.
const $ = (id) => document.getElementById(id);
const fmtTL = (n) => new Intl.NumberFormat('tr-TR', { style:'currency', currency:'TRY' }).format(Number(n || 0));
function toast(msg){ const t=$('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),3200); }
function safeFilePart(s){ return String(s || 'Musteri').trim().replace(/[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ_-]+/g,'_').slice(0,40) || 'Musteri'; }
function excelDate(){ const d=new Date(); return d.toLocaleString('tr-TR', { dateStyle:'short', timeStyle:'short' }); }
function fileStamp(){ const d=new Date(); const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`; }
function base64ToArrayBuffer(base64){
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
  return bytes.buffer;
}
async function getProductWorkbookBuffer(){
  try{
    const res = await fetch('data/urunler.xlsx', { cache:'no-store' });
    if(!res.ok) throw new Error('urunler.xlsx okunamadı');
    return await res.arrayBuffer();
  }catch(e){
    if(window.EMBEDDED_URUNLER_XLSX_BASE64) return base64ToArrayBuffer(window.EMBEDDED_URUNLER_XLSX_BASE64);
    throw e;
  }
}
async function loadProducts(){
  if(!window.XLSX){ setTimeout(loadProducts,120); return; }
  const buf = await getProductWorkbookBuffer();
  const wb = XLSX.read(buf, { type:'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' }).slice(1);
  state.products = rows.filter(r => r[0] !== '' && r[1] !== '' && r[2] !== '').map(r => ({
    category:String(r[0]).trim(), code:String(r[1]).trim(), name:String(r[2]).trim(), price:Number(r[3] || 0)
  }));
  state.grouped = new Map();
  for(const p of state.products){ if(!state.grouped.has(p.category)) state.grouped.set(p.category, []); state.grouped.get(p.category).push(p); }
  renderProducts(); updateTotals();
}
function renderProducts(){
  const q = $('searchBox').value.trim().toLocaleLowerCase('tr-TR');
  const area = $('productArea'); area.innerHTML='';
  let count=0;
  const categories = [...state.grouped.keys()].sort((a,b)=>a.localeCompare(b,'tr'));
  for(const cat of categories){
    const items = state.grouped.get(cat).filter(p => !q || p.name.toLocaleLowerCase('tr-TR').includes(q) || p.code.toLocaleLowerCase('tr-TR').includes(q));
    if(!items.length) continue; count += items.length;
    const details = document.createElement('details'); details.className='category'; if(q) details.open=true;
    const summary = document.createElement('summary'); summary.innerHTML = `<span>${cat}</span><small>${items.length} ürün</small>`; details.appendChild(summary);
    const rows = document.createElement('div'); rows.className='rows';
    for(const p of items){
      const row = document.createElement('div'); row.className='row';
      const qty = state.order.get(p.code) || 0;
      row.innerHTML = `<div><div class="name">${escapeHtml(p.name)}</div><div class="meta">Kod: ${escapeHtml(p.code)} · ${fmtTL(p.price)}</div></div><div class="qty"><button type="button" data-act="dec" data-code="${escapeAttr(p.code)}">−</button><input inputmode="numeric" pattern="[0-9]*" data-code="${escapeAttr(p.code)}" value="${qty}"><button type="button" data-act="inc" data-code="${escapeAttr(p.code)}">+</button></div>`;
      rows.appendChild(row);
    }
    details.appendChild(rows); area.appendChild(details);
  }
  if(!count) area.innerHTML='<div class="empty">Aramaya uygun ürün bulunamadı.</div>';
}
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
function escapeAttr(s){ return escapeHtml(s).replace(/`/g,'&#096;'); }
function setQty(code, val){ const n=Math.max(0, parseInt(val,10)||0); if(n) state.order.set(code,n); else state.order.delete(code); updateTotals(); }
function updateTotals(){ let qty=0, amount=0; for(const p of state.products){ const q=state.order.get(p.code)||0; qty+=q; amount+=q*p.price; } $('totalQty').textContent=qty; $('totalAmount').textContent=fmtTL(amount); }
function selectedRows(){ return state.products.map(p => ({...p, qty:state.order.get(p.code)||0})).filter(p=>p.qty>0); }
function validateOrder(){
  const salesRep = $('salesRep').value.trim();
  const code = $('customerCode').value.trim();
  if(!salesRep) throw new Error('Satış temsilcisi ad soyadını giriniz.');
  if(!code) throw new Error('Müşteri kodu giriniz.');
  if(!selectedRows().length) throw new Error('Siparişte miktar girilmiş ürün yok.');
}
function buildWorkbook(){
  validateOrder();
  const salesRep = $('salesRep').value.trim(); const code = $('customerCode').value.trim(); const title = $('customerTitle').value.trim();
  const rows = selectedRows();
  const data = [ ['KUZEYPET SİPARİŞ FORMU'], [], ['Satış Temsilcisi', salesRep], ['Müşteri Kodu', code], ['Müşteri Ünvanı', title], ['Sipariş Tarihi', excelDate()], [], ['Sıra','Ürün Kodu','Ürün','Liste Fiyatı','Adet','Satır Toplamı'] ];
  let i=1, totalQty=0, totalAmount=0;
  for(const p of rows){ const line=p.qty*p.price; totalQty+=p.qty; totalAmount+=line; data.push([i++, p.code, p.name, p.price, p.qty, line]); }
  data.push([], ['', '', '', 'Toplam Kalem', rows.length, ''], ['', '', '', 'Toplam Adet', totalQty, ''], ['', '', '', 'Genel Toplam', '', totalAmount]);
  const wb = XLSX.utils.book_new(); const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{wch:8},{wch:16},{wch:44},{wch:14},{wch:10},{wch:16}];
  ws['!freeze'] = {xSplit:0, ySplit:8};
  XLSX.utils.book_append_sheet(wb, ws, 'Sipariş'); return wb;
}
function createOrderFile(){
  const wb = buildWorkbook(); const code = safeFilePart($('customerCode').value); const name=`Siparis_${code}_${fileStamp()}.xlsx`;
  const arr = XLSX.write(wb, { bookType:'xlsx', type:'array' });
  const file = new File([arr], name, { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  state.lastFile=file; state.lastFileName=name; return file;
}
function downloadFile(file){ const a=document.createElement('a'); a.href=URL.createObjectURL(file); a.download=file.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
async function saveOrder(){ try{ const file=createOrderFile(); downloadFile(file); toast(`${file.name} oluşturuldu.`); }catch(e){ toast(e.message); } }
function fileToBase64(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result).split(',')[1]);
    reader.onerror=()=>reject(new Error('Excel dosyası mail için hazırlanamadı.'));
    reader.readAsDataURL(file);
  });
}
function openMailModal(){
  try{
    validateOrder();
    const modal=$('mailModal');
    $('recipientEmailModal').value='didemhan@kuzeypet.com';
    $('mailModalStatus').textContent='';
    modal.hidden=false;
    document.body.classList.add('modal-open');
    setTimeout(()=>$('recipientEmailModal').focus(),50);
  }catch(e){ toast(e.message); }
}
function closeMailModal(){
  if($('confirmMailBtn').disabled) return;
  $('mailModal').hidden=true;
  document.body.classList.remove('modal-open');
  $('mailModalStatus').textContent='';
}
async function confirmMailSend(){
  const recipientEmail=$('recipientEmailModal').value.trim();
  const btn=$('confirmMailBtn');
  const status=$('mailModalStatus');
  try{
    if(!recipientEmail) throw new Error('E-posta adresi giriniz.');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) throw new Error('Geçerli bir e-posta adresi giriniz.');
    const file=createOrderFile();
    btn.disabled=true; btn.textContent='Gönderiliyor...';
    status.textContent='Excel hazırlanıyor ve mail gönderiliyor...';
    const payload={
      salesRep:$('salesRep').value.trim(),
      customerCode:$('customerCode').value.trim(),
      customerTitle:$('customerTitle').value.trim(),
      recipientEmail,
      fileName:file.name,
      fileBase64:await fileToBase64(file)
    };
    const res=await fetch('/api/send-order', {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)
    });
    let result={};
    try{ result=await res.json(); }catch(_e){}
    if(!res.ok) throw new Error(result.error || `Mail gönderilemedi (${res.status}).`);
    status.textContent='Mail başarıyla gönderildi.';
    toast(`Sipariş ${recipientEmail} adresine gönderildi.`);
    setTimeout(()=>{ btn.disabled=false; btn.textContent='Gönder'; closeMailModal(); },700);
    return;
  }catch(e){
    status.textContent=e.message || 'Mail gönderilemedi.';
  }
  btn.disabled=false; btn.textContent='Gönder';
}
function logout(){
  state.order.clear();
  ['salesRep','customerCode','customerTitle','searchBox'].forEach(id=>{ const el=$(id); if(el) el.value=''; });
  sessionStorage.clear();
  localStorage.removeItem('kuzeypet-order');
  if(EXIT_URL==='about:blank') window.location.replace('about:blank');
  else window.location.replace(EXIT_URL);
}
document.addEventListener('input', e => { if(e.target.id==='searchBox') renderProducts(); if(e.target.matches('.qty input')) setQty(e.target.dataset.code, e.target.value); });
document.addEventListener('keydown', e => {
  if(e.key==='Escape' && !$('mailModal').hidden) closeMailModal();
  if(e.key==='Enter' && e.target.id==='recipientEmailModal'){ e.preventDefault(); confirmMailSend(); }
});
document.addEventListener('click', e => {
  if(e.target.id==='mailModal') closeMailModal();
  const b=e.target.closest('button'); if(!b) return;
  if(b.id==='saveBtn') saveOrder();
  if(b.id==='mailBtn') openMailModal();
  if(b.id==='confirmMailBtn') confirmMailSend();
  if(b.id==='cancelMailBtn' || b.id==='closeMailModal') closeMailModal();
  if(b.id==='logoutBtn') logout();
  if(b.dataset.act){ const code=b.dataset.code; const current=state.order.get(code)||0; setQty(code, b.dataset.act==='inc'?current+1:current-1); const input=document.querySelector(`.qty input[data-code="${CSS.escape(code)}"]`); if(input) input.value=state.order.get(code)||0; }
});
window.addEventListener('load', loadProducts);
