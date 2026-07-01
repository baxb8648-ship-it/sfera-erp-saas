const fs = require('fs');
const html = `<html><body>
<div style='width: 100px; height: 100px; background: linear-gradient(135deg, transparent 45%, red 45%, red 55%, transparent 55%); background-size: 10px 10px;'></div>
<svg width='100' height='100'>
  <defs>
    <pattern id='p45' width='10' height='10' patternUnits='userSpaceOnUse' patternTransform='rotate(45)'>
      <line x1='0' y1='0' x2='0' y2='10' stroke='blue' stroke-width='2'/>
    </pattern>
    <pattern id='p_minus45' width='10' height='10' patternUnits='userSpaceOnUse' patternTransform='rotate(-45)'>
      <line x1='0' y1='0' x2='0' y2='10' stroke='green' stroke-width='2'/>
    </pattern>
  </defs>
  <rect x='0' y='0' width='50' height='100' fill='url(#p45)'/>
  <rect x='50' y='0' width='50' height='100' fill='url(#p_minus45)'/>
</svg></body></html>`;
fs.writeFileSync('test.html', html);
console.log('done');
