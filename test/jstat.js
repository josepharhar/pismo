const fs = require('fs');

if (process.argv.length !== 3) {
  console.log('two arguments required, found: ' + JSON.stringify(process.argv));
  process.exit(1);
}

fs.stat(process.argv[2], (err, stats) => {
  if (err) {
    console.log('stat() failed with error: ' + err);
    return;
  }

  const seconds = Math.floor(stats.mtimeMs / 1000);
  const nanoseconds = (stats.mtimeMs * 1000 * 1000)
    % 1000000000;
  console.log('mtime seconds.nanoseconds: '
    + seconds + '.' + nanoseconds);
  console.log('mtimeMs: ' + stats.mtimeMs);
});
