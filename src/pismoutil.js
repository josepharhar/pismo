import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';
import * as stream from 'stream';
import * as events from 'events';

// @ts-ignore
import * as nanostat from 'nanostat';
// @ts-ignore
import * as nanoutimes from 'nanoutimes';

import * as filesize from 'filesize';
import * as mkdirp from 'mkdirp';
import * as rimraf from 'rimraf';
import {Operation, MergeFile} from '../web/src/PismoTypes';

const readdirPromise = util.promisify(fs.readdir);
const readFilePromise = util.promisify(fs.readFile);
const writeFilePromise = util.promisify(fs.writeFile);

/** @typedef {{path: string, mtimeS: number, mtimeNs: number, size: number, hash: string, customAttributeNameToValue: !Object<string, string>}} FileInfo */
/** @type {!JsonSchema} */
export const FileInfoSchema = {
  path: 'string',
  mtimeS: 'number',
  mtimeNs: 'number',
  size: 'number',
  hash: 'string',
  customAttributeNameToValue: 'object'
};
// lastUpdated can be -1 to signal that an update never happened
/** @typedef {{path: string, lastUpdated: number, customAttributeNameToCommand: !Object<string, string>, files: !Array<FileInfo>}} TreeFile */
/** @type {!JsonSchema} */
export const TreeFileSchema = {
  path: 'string',
  lastUpdated: 'number',
  customAttributeNameToCommand: 'object',
  files: [FileInfoSchema]
};
/** @typedef {!{mtimeS: number, mtimeNs: number}} FileTime */

// TODO move this to PismoTypes.ts to avoid only updating one of the two?
/** @type {!JsonSchema} */
export const OperationSchema = {
  operator: 'string',
  operands: [{tree: 'string', relativePath: 'string'}]
};
/** @type {!JsonSchema} */
export const MergeFileSchema = {
  baseBranch: 'string',
  otherBranch: 'string',
  operations: [OperationSchema]
};

/**
 * @param {string=} filepath
 * @return {{logInfo: function(string), logError: function(string), logVerbose: function(string)}}
 */
export function getLogger(filepath) {
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
    logError: message => console.log(errorPrefix + message),
    logVerbose: message => {
      // @ts-ignore
      if (global.__pismo_verbose) console.log(message);
    }
  };
}

const {logInfo, logError} = getLogger(__filename);

/**
 * TODO transition off usage of this in other files
 * @return {!string}
 */
export function getDotPath() {
  return path.join(os.homedir(), '/.pismo');
}

/**
 * @return {!string}
 */
export function getAbsoluteTreesPath() {
  return path.join(getDotPath(), '/trees');
}

/**
 * @return {string}
 */
export function getAbsoluteRemotesPath() {
  return path.join(getDotPath(), '/remotes');
}

/**
 * TODO TODO TODO use a caching layer for this instead, make it a class as well?
 * this will have to also provide a way of flushing everything to disk and clearing
 * the "cache" in case we are running in server mode and want to flush before the program
 * ends... wait how did i even handle this for remotes???
 *
 * Returns tree files mapped from name to filepath
 * ex: {"foo": "/home/jarhar/.pismo/trees/foo.json",
 *      "asdf": "/home/jarhar/.pismo/trees/asdf.json"}
 *
 * @return {!Promise<Object<string, string>>}
 */
export async function getTreeNamesToPaths() {
  /** @type {Object<string, string>} */
  const output = {};
  const treespath = getAbsoluteTreesPath();

  let filenames;
  try {
    filenames = await readdirPromise(treespath);
  } catch (error) {
    logError(`getTreeNamesToPaths() readdir(${treespath}) failed`);
    throw error;
  }

  for (const filename of filenames) {
    if (!filename.endsWith('.json')) {
      logError(`Found non-json file in /trees dir: ${filename}`);
      continue;
    }

    const name = filename.replace(/.json$/, '');
    output[name] = path.join(treespath, filename);
  }
  return output;
}

/**
 * Reads a file within the ~/.pismo directory. If the file doesn't exist, then
 * creates the file as well.
 *
 * @param {!string} relativePath
 * @return {!Promise<string>}
 */
export async function readDotFile(relativePath) {
  const filepath = path.join(getDotPath(), relativePath);
  try {
    return await readFilePromise(filepath, 'utf8');
  } catch (err) {
    logError(`Failed to read file. filepath: ${filepath}`);
    throw err;
  }
}

/**
 * @param {string} path
 */
export async function mkdirpPromise(path) {
  return new Promise((resolve, reject) => {
    mkdirp(path, error => {
      if (error)
        reject(error);
      else
        resolve();
    });
  });
}

/**
 * Reads a file within the ~/.pismo directory and calls JSON.parse() on it.
 *
 * @param {!string} relativePath
 * @return {!Promise<?Object>}
 */
export async function readDotFileFromJson(relativePath) {
  const contents = await readDotFile(relativePath);

  try {
    return JSON.parse(contents);
  } catch (err) {
    logError(`Failed to JSON.parse() dotfile: ${relativePath}`);
    throw err;
  }
}

/**
 * Writes data to a file in the ~/.pismo directory.
 * If data is an object, JSON.stringify() will be called on it.
 * Will create directories if needed.
 *
 * @param {!string} relativePath
 * @param {string|number|Object} data
 */
export async function writeDotFile(relativePath, data) {
  const filepath = path.join(getDotPath(), relativePath);

  const dirpath = path.dirname(filepath);
  try {
    mkdirp.sync(dirpath);
  } catch (error) {
    logError(`Failed to mkdirp with filepath: ${dirpath}`);
    throw error;
  }

  if (typeof(data) === 'object') {
    data = JSON.stringify(data, null, 2);
  }
  try {
    await writeFilePromise(filepath, data);
  } catch(err) {
    logError(`Failed to write to filepath: ${filepath}`);
    throw err;
  }
}

/**
 * TODO remove this in favor of readDotFileToJson()
 * On failure, returns null and logs error message.
 *
 * @param {!string} filepath
 * @return {!Promise<?Object>}
 */
export async function readFileToJson(filepath) {
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
 * @param {string} filepath
 */
export async function deletePath(filepath) {
  return new Promise((resolve, reject) => {
    rimraf(filepath, {disableGlob: true}, error => {
      if (error) {
        logError(`Failed to recursively delete path: ${filepath}, error: ${error}`);
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

/**
 * @param {string} relativePath
 */
export async function deleteDotPath(relativePath) {
  return deletePath(path.join(getDotPath(), relativePath));
}

/**
 * @param {!string} treename
 * @return {!Promise<!TreeFile>}
 */
export async function readTreeByName(treename) {
  const treeNamesToPaths = await getTreeNamesToPaths();
  const filepath = treeNamesToPaths[treename];
  if (!filepath)
    throw new Error(`Couldn't find a tree file named ${treename}`);
  try {
    return await readFileToJson(filepath);
  } catch (err) {
    logError(`Failed to read tree file named ${treename} at filepath ${filepath}`);
    throw err;
  }
}

/** @type {!Object<string, string>} */
export const Colors = {
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
export function logColor(color, message) {
  console.log(`${color}%s${Colors.reset}`, message);
}

/**
 * @param {!FileInfo} fileInfo
 * @return {!Object}
 */
export function humanReadableFileInfo(fileInfo) {
  const copy = JSON.parse(JSON.stringify(fileInfo));

  /*const mtime = new Date(0);
  mtime.setUTCSeconds(copy.mtimeMs);
  copy.mtimeMs = mtime.toISOString();*/
  //copy.mtimeMs = new Date(copy.mtimeMts).toISOString();
  //copy.mtimeMs = new Date(Math.floor(copy.mtimeMts)).toISOString();
  /*const mtime = new Date(0);
  mtime.setUTCSeconds(copy.mtimeMs);
  copy.mtimeMs = mtime.toISOString();*/
  copy.mtimeMs = dateToString(new Date(copy.mtimeMs));

  copy.size = filesize(copy.size);

  return copy;
}

/**
 * https://stackoverflow.com/a/17415677
 * @param {!Date} date
 * @return {!string}
 */
export function dateToString(date) {
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

/**
 * @param {!stream.Readable} stream
 * @return {!Promise<string>}
 */
export async function streamToString(stream) {
  return new Promise((resolve, reject) => {
    let chunks = '';
    stream.on('data', chunk => {
      chunks += chunk;
    });
    stream.on('error', reject);
    stream.on('end', () => resolve(chunks));
  });
}

/**
 * @param {string} absolutePath
 * @return {!FileTime}
 */
export function getLocalFileTime(absolutePath) {
  const stats = nanostat.statSync(absolutePath);
  return {
    // @ts-ignore
    mtimeS: Number(stats.mtimeMs / 1000n),
    // @ts-ignore
    mtimeNs: Number(stats.mtimeNs)
  };
}

/**
 * @param {string} absolutePath
 * @param {!FileTime} filetime
 */
export function setLocalFileTime(absolutePath, filetime) {
  nanoutimes.utimesSync(absolutePath, null, null, filetime.mtimeS, filetime.mtimeNs);
}

///** @typedef {'string'|'number'|'boolean'|!Array<!JsonSchema>|!Object<string, !JsonSchema>} JsonSchema */
/** @typedef {'string'|'number'|'boolean'|!Array<*>|!Object<string, *>|'object'} JsonSchema */
///** @typedef {*} JsonSchema */
/**
 * ex obj: {
 *   nested: {
 *     str: 'str',
 *     num: 1234,
 *     bool: true
 *   },
 *   array: [
 *     'one',
 *     'two'
 *   ]
 * }
 * 
 * ex schema: {
 *   nested: {
 *     str: 'string',
 *     num: 'number',
 *     bool: 'boolean'
 *   },
 *   array: ['string']
 * }
 * 
 * @template T
 * @param {*} rootObj
 * @param {JsonSchema} rootSchema
 * @return {!T}
 */
export function parseJson(rootObj, rootSchema) {
  /** @type {!Array<!{obj: *, schema: JsonSchema}>} */
  const stackqueue = [];
  stackqueue.push({
    obj: rootObj,
    schema: rootSchema
  });

  while (stackqueue.length) {
    const {obj, schema} = stackqueue.pop();

    /**
     * @param {string} string 
     */
    function error(string) {
      return new Error(string
        + '\n  rootObj: ' + JSON.stringify(rootObj, null, 4)
        + '\n  rootSchema: ' + JSON.stringify(rootSchema, null, 4)
        + '\n  obj: ' + JSON.stringify(obj)
        + '\n  schema: ' + JSON.stringify(schema));
    }

    if (schema === 'string' || schema === 'boolean' || schema === 'number' || schema === 'object') {
      if (typeof(obj) !== schema)
        throw error('invalid json. expected: ' + schema + ', found: ' + typeof(obj));

    } else if (Array.isArray(schema)) {
      if (schema.length > 1)
        throw error('invalid schema, found multiple values in array');
      
      if (!Array.isArray(obj)) {
        throw error('invalid json, expected array. found: ' + typeof(obj));
      }
      const innerSchema = schema[0];
      for (const value of obj) {
        stackqueue.push({obj: value, schema: innerSchema});
      }

    } else if (typeof(schema) === 'object') {
      if (typeof(obj) !== 'object')
        throw error('invalid json, expected object. found: ' + typeof(obj));

      const expectedKeys = Object.keys(schema).sort();
      const actualKeys = Object.keys(obj).sort();
      if (!areArraysEqual(expectedKeys, actualKeys)) {
        throw error('invalid json, object field mismatch'
          + ', expected: ' + JSON.stringify(expectedKeys)
          + ', actual: ' + JSON.stringify(actualKeys));
      }
      for (const key of expectedKeys) {
        stackqueue.push({obj: obj[key], schema: schema[key]});
      }

    } else {
      throw error('invalid schema');
    }
  }

  return /** {!T} */ (rootObj);
}

/**
 * Only checks === on values in the arrays
 * 
 * @template T
 * @param {!Array<T>} one
 * @param {!Array<T>} two
 * @return {boolean}
 */
export function areArraysEqual(one, two) {
  if (!Array.isArray(one) || !Array.isArray(two))
    return false;

  for (let i = 0; i < one.length; i++) {
    if (one[i] !== two[i])
      return false;
  }
  return true;
}

/**
 * @typedef {!{
 *   mtimeMs: bigint,
 *   mtimeNs: bigint,
 *   mtimeS: bigint,
 *   atimeMs: bigint,
 *   atimeNs: bigint,
 *   atimeS: bigint
 * }} Stats
 */
/**
 * @param {string} path
 * @return {!Stats}
 */
export function stat(path) {
  try {
    // @ts-ignore
    return nanostat.statSync(path);
  } catch (error) {
    throw new ErrorWrapper(error, `Failed to nanostat.statSync path: ${path}`);
  }
}

export class ErrorWrapper extends Error {
  /**
   * @param {!Error} error 
   * @param {string} message 
   */
  constructor(error, message) {
    super();
    this.name = 'ErrorWrapper';
    //this.message = message + '\n' + error.message;
    this.wrappedMessage = message
    this.message = error.message;
  }
};

/**
 * @param {number} epoch
 * @return {!Date}
 */
export function epochToDate(epoch) {
  // Date constructor takes ms instead of seconds, so convert
  return new Date(epoch * 1000);
}

/**
 * @param {!Date} date
 * @return {string}
 */
export function timeElapsedToString(date) {
  const diffMs = new Date().getTime() - date.getTime();
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(seconds / (60 * 60));
  const days = Math.floor(seconds / (60 * 60 * 24));

  if (days > 0)
    return days === 1
      ? `${days} day ago`
      : `${days} days ago`;
  if (hours > 0)
    return hours === 1
      ? `${hours} hour ago`
      : `${hours} hours ago`;
  if (minutes > 0)
    return minutes === 1
      ? `${minutes} minute ago`
      : `${minutes} minutes ago`;
  if (seconds > 0)
    return seconds === 1
      ? `${seconds} second ago`
      : `${seconds} seconds ago`;
  return 'now';
}

///**
// * TODO is this a bad design pattern?
// *    i havent committed to reading files this way in other code
// * This reads a dir, checking if the dir exists first. if it
// * doesnt exist, returns an empty array.
// * @param {string} path
// * @return {!Promise<!Array<fs.Dirent>>}
// */
//export function readdirSafe(path) {
//  return new Promise((resolve, reject) => {
//    fs.access(path, (error) => {
//      if (error) {
//        resolve();
//        return;
//      }
//
//      fs.readdir(path, {withFileTypes: true}, (error, dirents) => {
//        if (error)
//          reject(error);
//        else
//          resolve(dirents);
//      });
//    });
//  });
//}

/**
 * @param {!FileInfo} a 
 * @param {!FileInfo} b 
 * @return {number}
 */
export function fileInfoComparator(a, b) {
  if (a.path < b.path)
    return -1;
  if (a.path > b.path)
    return 1;
  return 0;
}

//export class ProgressStream extends stream.Transform {
//  /**
//   * @param {number} totalLength
//   * @param {number} updateIntervalMs
//   */
//  constructor(totalLength, updateIntervalMs) {
//    super();
//    this._totalLength = totalLength;
//    this._updateIntervalMs = updateIntervalMs;
//    /** @type {number} */
//    this._lastUpdatedMs = 0;
//    this._elapsedLength = 0;
//
//    this._maybeUpdateProgress();
//  }
//
//  _maybeUpdateProgress() {
//    const currentTimeMs = new Date().getTime();
//    const doUpdated = this._lastUpdatedMs + this._updateIntervalMs < currentTimeMs;
//    console.log('_maybeUpdateProgress'
//      + '\n           currentTimeMs: ' + currentTimeMs
//      + '\n     this._lastUpdatedMs: ' + this._lastUpdatedMs
//      + '\n  this._updateIntervalMs: ' + this._updateIntervalMs
//      + '\n     this._elapsedLength: ' + this._elapsedLength
//      + '\n       this._totalLength: ' + this._totalLength
//      + '\n                doUpdate: ' + doUpdated
//    );
//    if (this._lastUpdatedMs + this._updateIntervalMs < currentTimeMs) {
//      // do update
//      this._lastUpdatedMs = currentTimeMs;
//      this.emit('progress', {
//        percentage: this._elapsedLength / this._totalLength,
//        complete: false
//      });
//    }
//  }
//
//  _transform(chunk, encoding, callback) {
//    if (encoding !== 'buffer')
//      logError('ProgressStream._transform bad encoding: ' + encoding);
//    this._elapsedLength += chunk.length;
//    this._maybeUpdateProgress();
//    this.push(chunk);
//    callback();
//  }
//
//  // input stream has ended
//  _flush() {
//    this.emit('progress', {
//      percentage: 100,
//      complete: true
//    });
//  }
//}