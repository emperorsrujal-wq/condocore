const fs = require('fs');
const file = './src/firebase.js';
let code = fs.readFileSync(file, 'utf8');

let idx = 0;
while (true) {
  idx = code.indexOf('onSnapshot(', idx);
  if (idx === -1) break;
  let pCount = 0;
  let start = idx + 'onSnapshot'.length;
  let end = -1;
  for (let i = start; i < code.length; i++) {
    if (code[i] === '(') pCount++;
    else if (code[i] === ')') {
      pCount--;
      if (pCount === 0) {
        end = i;
        break;
      }
    }
  }
  if (end !== -1) {
    let content = code.substring(start, end);
    if (!content.includes('console.warn')) {
      code = code.slice(0, end) + `, err => console.warn('Listener error:', err.code)` + code.slice(end);
    }
  }
  idx = end + 1;
}
fs.writeFileSync(file, code);
console.log('Firebase.js updated successfully.');
