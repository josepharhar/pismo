const os = require('os');
const path = require('path');
const fs = require('fs');
const util = require('util');

const filesize = require('filesize');

const readdirPromise = util.promisify(fs.readdir);
const readFilePromise = util.promisify(fs.readFile);

/** @typedef {{path: string, mtimeMs: number, size: number, hash: string}} FileInfo */
/** @typedef {{path: string, lastModified: string, files: Array<FileInfo>}} TreeFile */
/** @typedef {{operator: 'rm'|'cp', operands: !Array<{tree: 'base'|'other', relativePath: string}>}} Operation */
/** @typedef {{base: string, other: string, operations: !Array<!Operation>}} MergeFile */

/**
 * @param {string=} filepath
 * @return {{logInfo: function(string), logError: function(string)}}
 */
exports.getLogger = function(filepath) {
  if (filepath)
    filepath = path.basename(filepath);

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

const {logInfo, logError} = exports.getLogger(__filename);

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

/**
 * @param {!string} treename
 * @return {!Promise<!TreeFile>}
 */
exports.readTreeByName = async function(treename) {
  const treeNamesToPaths = await exports.getTreeNamesToPaths();
  const filepath = treeNamesToPaths[treename];
  if (!filepath)
    throw new Error(`Couldn't find a tree file named ${treename}`);
  try {
    return await exports.readFileToJson(filepath);
  } catch (err) {
    logError(`Failed to read tree file named ${treename} at filepath ${filepath}`);
    throw err;
  }
}

/** @type {!Object<string, string>} */
exports.Colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',

  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  blackBg: '\x1b[40m',
  redBg: '\x1b[41m',
  greenBg: '\x1b[42m',
  yellowBg: '\x1b[43m',
  blueBg: '\x1b[44m',
  magentaBg: '\x1b[45m',
  cyanBg: '\x1b[46m',
  whiteBg: '\x1b[47m',
};

/**
 * @param {!string} color
 * @param {!string} message
 */
exports.logColor = function(color, message) {
  console.log(`${color}%s${exports.Colors.reset}`, message);
}

/**
 * @param {!FileInfo} fileInfo
 * @return {!Object}
 */
exports.humanReadableFileInfo = function(fileInfo) {
  const copy = JSON.parse(JSON.stringify(fileInfo));

  /*const mtime = new Date(0);
  mtime.setUTCSeconds(copy.mtimeMs);
  copy.mtimeMs = mtime.toISOString();*/
  //copy.mtimeMs = new Date(copy.mtimeMts).toISOString();
  //copy.mtimeMs = new Date(Math.floor(copy.mtimeMts)).toISOString();
  /*const mtime = new Date(0);
  mtime.setUTCSeconds(copy.mtimeMs);
  copy.mtimeMs = mtime.toISOString();*/
  copy.mtimeMs = exports.dateToString(new Date(copy.mtimeMs));

  copy.size = filesize(copy.size);

  return copy;
}

/**
 * https://stackoverflow.com/a/17415677
 * @param {!Date} date
 * @return {!string}
 */
exports.dateToString = function(date) {
  const tzo = -date.getTimezoneOffset(),
    dif = tzo >= 0 ? '+' : '-',
    pad = function(num) {
      var norm = Math.floor(Math.abs(num));
      return (norm < 10 ? '0' : '') + norm;
    };
  return date.getFullYear() +
    '-' + pad(date.getMonth() + 1) +
    '-' + pad(date.getDate()) +
    'T' + pad(date.getHours()) +
    ':' + pad(date.getMinutes()) +
    ':' + pad(date.getSeconds()) +
    dif + pad(tzo / 60) +
    ':' + pad(tzo % 60);
}
