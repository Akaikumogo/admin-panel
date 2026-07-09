const res = await fetch('https://elektrolearn.uzbekistonmet.uz/assets/index-L3Xwdq4d.js');
const t = await res.text();
const matches = t.match(/https?:\/\/[^'"]+uzbekistonmet[^'"]*/g) || [];
console.log([...new Set(matches)].slice(0, 15));
const apiMatch = t.match(/VITE_API[^'"]{0,100}/g);
console.log('api refs:', apiMatch?.slice(0, 5));
