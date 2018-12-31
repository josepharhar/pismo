const os = require('os');
const path = require('path');
const fs = require('fs');
const util = require('util');

const readdirPromise = util.promisify(fs.readdir);
const readFilePromise = util.promisify(fs.readFile);

/**
 * @param {string=} filepath
 * @return {{logInfo: function(string), logError: function(string)}}
 */
exports.getLogger = function(filepath) {
  if (filepath) {
    filepath = path.basename(filepath);
  }

  const infoPrefix = filepath
    ? `[INFO ${filepath}] `
    : '[INFO] ';
  const errorPrefix = filepath
    ? `[ERROR ${filepath}] `
    : `[ERROR] `;

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

/**
 * On failure, returns null and logs error message.
 *
 * @param {!string} filepath
 * @return {!Promise<?Object>}
 */
exports.readFileToJson = async function(filepath) {
  let filecontents;
  try {
    filecontents = await readFilePromise(filepath, 'utf8');
  } catch (err) {
    logError(
      `Failed to read file.\n  filepath: ${filepath}\n  error: ${err}`);
    return null;
  }

  try {
    return JSON.parse(filecontents);
  } catch (err) {
    logError(
      `Failed to parse file to json.\n  filepath: ${filepath}\n error: ${err}`);
    return null;
  }
}
