const fs = require('fs');
const path = require('path');
const os = require('os');
const util = require('util');

const pismoutil = require('./pismoutil.js');
//const {TreeFile} = require('./treefile.js');

const readFilePromise = util.promisify(fs.readFile);
const {logInfo, logError} = pismoutil.getLogger(__filename);

/** @typedef {!{path: string, mtime: string, size: string}} FileInfo */
/** @typedef {!{path: string, lastModified: string, files: Array<FileInfo>}} TreeFile */

/**
 * @param {!string} name
 */
exports.updateInternal = async function(name) {
  const treeNamesToPaths = await pismoutil.getTreeNamesToPaths();
  if (!treeNamesToPaths[name]) {
    logError('Failed to find tree with name: ' + name);
    return;
  }

  /** @type {TreeFile} */
  const oldTreefile = await pismoutil.readFileToJson(
    treeNamesToPaths[name]);
  if (!oldTreefile) {
    logError('Failed to read tree json file for name: ' + name);
    return;
  }
  // TODO verifyTreeFile(treefile);

  /** @type {!Object<string, FileInfo>} */
  const fileinfoCache = {};
  for (const fileinfo of oldTreefile.files) {
    fileinfoCache[fileinfo.path] = fileinfo;
  }

  const basepath = oldTreefile.path;
}

/**
 * @param {import('yargs').Arguments<{name: string}>} argv
 */
exports.update = async function(argv) {
  exports.updateInternal(argv.name);
}
