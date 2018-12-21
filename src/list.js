const fs = require('fs');
const path = require('path');
const util = require('util');
fs.readFilePromise = util.promisify(fs.readFile);
fs.readdirPromise = util.promisify(fs.readdir);

/**
 * @param {import('yargs').Arguments} argv
 */
exports.list = async function(argv) {
  console.log('list.js argv: ' + JSON.stringify(argv, null, 2));

  const dotPath = path.join(process.env.HOME, '/.pismo/trees');

  let files;
  try {
    files = fs.readdir(dotPath);
  } catch (e) {
    console.log('failed to read path: ' + dotPath);
    console.log(err);
    return;
  }

  for (const file of files) {
    const filepath = path.join(dotPath, file);
  }
}
