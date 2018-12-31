const fs = require('fs');
const path = require('path');
const util = require('util');
const os = require('os');

const pismoutil = require('./pismoutil.js');

const readFilePromise = util.promisify(fs.readFile);
const readdirPromise = util.promisify(fs.readdir);
const {logInfo, logError} = pismoutil.getLogger(__filename);

/**
 * @param {import('yargs').Arguments<{}>} argv
 */
exports.list = async function(argv) {
  const treeNamesToPaths = await pismoutil.getTreeNamesToPaths();

  let first = true;
  for (const name in treeNamesToPaths) {
    if (first)
      first = false;
    else
      console.log();

    const tree = await pismoutil.readFileToJson(
      treeNamesToPaths[name]);
    if (tree === null) {
      logError('Failed to read tree json file for name: ' + name);
      return;
    }
    console.log(name);
    console.log('  path: ' + tree.path);
  }
}
