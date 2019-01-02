const fs = require('fs');
const path = require('path');
const os = require('os');
const util = require('util');
const crypto = require('crypto');

const pismoutil = require('./pismoutil.js');
//const {TreeFile} = require('./treefile.js');

const readFilePromise = util.promisify(fs.readFile);
const readdirPromise = util.promisify(fs.readdir);
const lstatPromise = util.promisify(fs.lstat);
const {logInfo, logError} = pismoutil.getLogger(__filename);

// TODO figure out how to export these - i hope it doesnt take a .ts.d file
/** @typedef {!{path: string, mtimeMs: string, size: string}} FileInfo */
/** @typedef {!{path: string, lastModified: string, files: Array<FileInfo>}} TreeFile */

/**
 * @param {!string} absoluteFilepath
 */
async function genHash(absoluteFilepath) {
  return new Promise((resolve, reject) => {
    const output = crypto.createHash('sha256');
    const input = fs.createReadStream(absoluteFilepath);
    input.on('error', reject);
    input.once('readable', () => resolve(output.read().toString('hex')));
    input.pipe(output);
  });
}

/**
 * Takes one entry off pathStack and scans it, adding more if found.
 *
 * @param {!string} relativePathToScan
 * @param {!function(!string) : void} addPathToScan
 * @param {!string} basepath
 * @param {!Object<string, FileInfo>} fileinfoCache
 */
async function scanPath(relativePathToScan, addPathToScan, basepath, fileinfoCache) {
  const absolutePathToScan = path.join(basepath, relativePathToScan);

  let dirents;
  try {
    dirents = await readdirPromise(
      absolutePathToScan,
      {withFileTypes: true});
  } catch (err) {
    logError(`readdir() failed. path: ${absolutePathToScan}`);
    throw err;
  }

  for (const dirent of dirents) {
    const relativeEntPath = path.join(relativePathToScan, dirent.name);
    const absoluteEntPath = path.join(basepath, relativeEntPath);

    if (dirent.isDirectory()) {
      addPathToScan(relativeEntPath);

    } else if (dirent.isFile()) {
      let stat;
      try {
        stat = await lstatPromise(absoluteEntPath);
      } catch (err) {
        logError(`lstat() failed. path: ${absoluteEntPath}`);
        throw err;
      }

      const newTreefile = {
        path: relativeEntPath,
        mtimeMs: stat.mtimeMs,
        size: stat.size,
        hash: null
      };

      // compute hash, using cache if available
      const cachedFileinfo = fileinfoCache[relativeEntPath];
      if (cachedFileinfo
          && cachedFileinfo.mtimeMs === newTreeFile.mtimeMs
          && cachedFileinfo.size === newTreeFile.size) {
        newTreefile.hash = cachedFileinfo.hash;

      } else {
        // recompute hash
        newTreefile.hash = await genHash(absoluteEntPath);
      }

    } else {
      // ignore other file types.
    }
  }
}

/**
 * @param {!string} name
 */
exports.updateInternal = async function(name) {
  const treeNamesToPaths = await pismoutil.getTreeNamesToPaths();
  if (!treeNamesToPaths[name]) {
    throw new Error('Failed to find tree with name: ' + name);
  }

  /** @type {TreeFile} */
  const oldTreefile = await pismoutil.readFileToJson(
    treeNamesToPaths[name]);
  if (!oldTreefile) {
    throw new Error('Failed to read tree json file for name: ' + name);
  }
  // TODO verifyTreeFile(treefile);
  
  /** @type {TreeFile} */
  const newTreefile = {
    path: oldTreefile.path,
    lastModified: oldTreefile.lastModified, // TODO update this now or later?
    files: []
  };

  /** @type {!Object<string, FileInfo>} */
  const fileinfoCache = {};
  for (const fileinfo of oldTreefile.files) {
    fileinfoCache[fileinfo.path] = fileinfo;
  }

  const basepath = oldTreefile.path;

  // depth first - explore tree using a stack
  const pathsToScan = [];
  pathsToScan.push('/');
  while (pathsToScan.length) {
    await scanPath(
      pathsToScan.pop(),
      newPathToScan => pathsToScan.push(newPathToScan),
      basepath,
      fileinfoCache);
  }
}

/**
 * @param {import('yargs').Arguments<{name: string}>} argv
 */
exports.update = async function(argv) {
  exports.updateInternal(argv.name);
}
