const os = require('os');
const path = require('path');
const fs = require('fs');
const util = require('util');

const readdirPromise = util.promisify(fs.readdir);

/**
 * @param {string=} prefix
 * @return {{logInfo: function(string), logError: function(string)}}
 */
exports.getLogger = function(prefix) {
  let infoPrefix, errorPrefix;
  if (prefix) {
    infoPrefix = '[INFO] ';
    errorPrefix = '[ERROR] ';
  } else {
    infoPrefix = `[INFO ${prefix}] `;
    errorPrefix = `[ERROR ${prefix}] `;
  }

  // TODO suppress INFO messages if --verbose is not supplied
  return {
    logInfo: message => console.log(infoPrefix + message),
    logError: message => console.log(errorPrefix + message)
  };
}

const {logInfo, logError} = exports.getLogger(path.basename(__filename));

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
    logInfo('getTreeFiles() call to readdir() failed: ' + err);
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
