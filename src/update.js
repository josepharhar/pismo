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
/** @typedef {!{path: string, mtimeMs: number, size: number, hash: string}} FileInfo */
/** @typedef {!{path: string, lastModified: string, files: Array<FileInfo>}} TreeFile */

/**
 * @param {!string} absoluteFilepath
 */
async function genHash(absoluteFilepath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const input = fs.createReadStream(absoluteFilepath);
    input.on('error', reject);
    hash.once('readable', () => resolve(hash.read().toString('hex')));
    input.pipe(hash);
  });
}

/**
 * Takes one entry off pathStack and scans it, adding more if found.
 *
 * @param {!string} relativePathToScan
 * @param {!function(!string) : void} addPathToScan
 * @param {!function(!FileInfo) : void} addFileInfo
 * @param {!string} basepath
 * @param {!Object<string, FileInfo>} fileinfoCache
 */
async function scanPath(
    relativePathToScan, addPathToScan, addFileInfo, basepath, fileinfoCache) {
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

      const newFileInfo = {
        path: relativeEntPath.replace(/\\/g, '/'), // make sure path is portable
        mtimeMs: stat.mtimeMs,
        size: stat.size,
        hash: null
      };

      // compute hash, using cache if available
      const cachedFileinfo = fileinfoCache[relativeEntPath];
      if (cachedFileinfo
          && cachedFileinfo.mtimeMs === newFileInfo.mtimeMs
          && cachedFileinfo.size === newFileInfo.size) {
        newFileInfo.hash = cachedFileinfo.hash;
        logInfo(`Using cached hash for ${newFileInfo.path}`);

      } else {
        // recompute hash
        newFileInfo.hash = await genHash(absoluteEntPath);
        logInfo(`Recomputing hash for ${newFileInfo.path}`);
        logInfo(`newFileInfo: ${JSON.stringify(newFileInfo, null, 2)}`);
        logInfo(`cachedFileinfo: ${JSON.stringify(cachedFileinfo, null, 2)}`);
      }

      addFileInfo(newFileInfo);

    } else {
      // ignore other file types.
    }
  }
}

/**
 * @param {!string} name
 */
exports.updateInternal = async function(name) {
  const treefilepath = (await pismoutil.getTreeNamesToPaths())[name];
  if (!treefilepath)
    throw new Error('Failed to find tree with name: ' + name);

  /** @type {TreeFile} */
  const oldTreefile = await pismoutil.readFileToJson(treefilepath);
  if (!oldTreefile) {
    throw new Error('Failed to read tree json file for name: ' + name);
  }
  // TODO verifyTreeFile(treefile); - file could be missing the fields we want
  
  /** @type {TreeFile} */
  const newTreefile = {
    path: oldTreefile.path,
    lastModified: new Date().toISOString(),
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
      newFileInfo => newTreefile.files.push(newFileInfo),
      basepath,
      fileinfoCache);
  }

  newTreefile.files.sort((a, b) => {
    if (a.path < b.path)
      return -1;
    if (a.path > b.path)
      return 1;
    return 0;
  });

  const writeFileError = await new Promise(resolve => {
    fs.writeFile(treefilepath, JSON.stringify(newTreefile, null, 2), resolve);
  });
  if (writeFileError) {
    logError(`Failed to write updated tree file to path: ${treefilepath}`);
    throw writeFileError;
  }

  logInfo(`Successfully updated tree: ${name}`);
}

/**
 * @param {import('yargs').Arguments} argv
 */
exports.update = async function(argv) {
  await exports.updateInternal(argv.name);
}
