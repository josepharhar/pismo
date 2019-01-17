const fs = require('fs');
const util = require('util');

const statPromise = util.promisify(fs.stat);

if (process.argv.length !== 3) {
  console.log('two arguments required, found: ' + JSON.stringify(process.argv));
  process.exit(1);
}

(async function() {
  const numberStat = await statPromise(process.argv[2]);
  const bigintStat = await statPromise(process.argv[2], {bigint: true});

  console.log('numberStat.mtimeMs: ' + numberStat.mtimeMs);
  console.log('bigintStat.mtimeMs: ' + bigintStat.mtimeMs);
})();
