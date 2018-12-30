const os = require('os');
const path = require('path');
const fs = require('fs');
const util = require('util');

const readdirPromise = util.promisify(fs.readdir);
const log = msg => console.log(`[${path.basename(__filename)}] ${msg}`);

/**
 * @return {!string}
 */
exports.getDotPath = function() {
  return path.join(os.homedir(), '/.pismo');
}

/**
 * @return {!string}
 */
exports.getTreesPath = function() {
  return path.join(exports.getDotPath(), '/trees');
}

/**
 * Returns tree files mapped from name to filepath
 * ex: {"foo": "/home/jarhar/.pismo/trees/foo.json",
 *      "asdf": "/home/jarhar/.pismo/trees/asdf.json"}
 *
 * @return {!Promise<Object<string, string>>}
 */
exports.getTreeNamesToPaths = async function() {
  /** @type {Object<string, string>} */
  const output = {};
  const treespath = exports.getTreesPath();

  let filenames;
  try {
    filenames = await readdirPromise(treespath);
  } catch (err) {
    log('getTreeFiles() call to readdir() failed: ' + err);
    return output;
  }

  for (const filename of filenames) {
    if (!filename.endsWith('.json'))
      continue;

    const name = filename.replace(/.json$/, '');
    output[name] = path.join(treespath, filename);
  }
  return output;
}
