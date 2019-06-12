const fs = require('fs');

let hexStr = '';
for (let i = 0; i < 255 * 255; i++) {
  hexStr += i.toString(16);
}

const buffer = Buffer.from(hexStr, 'hex');

fs.writeFileSync('binary', buffer);
