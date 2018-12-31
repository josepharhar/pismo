const fs = require('fs');
const path = require('path');
const os = require('os');
const util = require('util');

const pismoutil = require('./pismoutil.js');

const readFilePromise = util.promisify(fs.readFile);
const {logInfo, logError} = pismoutil.getLogger(path.basename(__filename));

/**
 * @param {!string} name
 */
exports.updateInternal = async function(name) {
  const treeNamesToPaths = await pismoutil.getTreeNamesToPaths();
  if (!treeNamesToPaths[name]) {
    logError('Failed to find tree with name: ' + name);
    return;
  }

  const fileobject = await pismoutil.readFileToJson(
    treeNamesToPaths[name]);
  if (fileobject === null) {
    logError('Failed to read tree json file for name: ' + name);
    return;
  }
}

/**
 * @param {import('yargs').Arguments<{name: string}>} argv
 */
exports.update = async function(argv) {
  exports.updateInternal(argv.name);
}
