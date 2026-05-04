// Check full body_html of 13-dead-end-drive for bgg-url div
const res = await fetch("https://www.boardgamebliss.com/products/13-dead-end-drive.json");
const { product } = await res.json();
const html = product.body_html || '';
const idx = html.indexOf('bgg');
console.log('bgg at index:', idx);
if (idx >= 0) console.log('context:', html.substring(Math.max(0, idx - 50), idx + 200));
else console.log('No bgg in body_html. Tags:', product.tags.split(',').filter(t => t.includes('BGG')));
