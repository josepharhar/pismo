const fs = require('fs');

let hexStr = '';
for (let i = 0; i < 255 * 255; i++) {
  hexStr += i.toString(16);
}

const buffer = Buffer.from(hexStr, 'hex');

fs.writeFileSync('binary', buffer);

fs.writeFileSync('invalidutf8', Buffer.from('c0c1f5f6f7f8f9fafbfcfdfeff', 'hex'));
