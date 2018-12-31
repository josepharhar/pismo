const fs = require('fs');
const path = require('path');
const os = require('os');
const util = require('util');

const pismoutil = require('./pismoutil.js');
//const {TreeFile} = require('./treefile.js');

const readFilePromise = util.promisify(fs.readFile);
const readdirPromise = util.promisify(fs.readdir);
const lstatPromise = util.promisify(fs.lstat);
const {logInfo, logError} = pismoutil.getLogger(__filename);

// TODO figure out how to export these - i hope it doesnt take a .ts.d file
/** @typedef {!{path: string, mtime: string, size: string}} FileInfo */
/** @typedef {!{path: string, lastModified: string, files: Array<FileInfo>}} TreeFile */

/**
 * @param {!string} path
 * @param {!Array<string>} pathStack
 * @param {!string} basepath
 */
async function scanPath(path, pathStack, basepath) {
}

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
    const relativePathToScan = pathsToScan.pop();
    const absolutePathToScan = path.join(basepath, pathsToScan.pop());

    let dirents;
    try {
      dirents = await readdirPromise(
        absolutePathToScan,
        {withFileTypes: true});
    } catch (err) {
      logError(`readdir() failed.\n  path: ${absolutePathToScan}\n  error: ${err}`);
      return;
    }

    for (const dirent of dirents) {
      const relativeEntPath = path.join(relativePathToScan, dirent.name);
      const absoluteEntPath = path.join(basepath, relativeEntPath);

      if (dirent.isDirectory()) {
        pathsToScan.push(relativeEntPath);

      } else if (dirent.isFile()) {
        let stat;
        try {
          stat = await lstatPromise(absoluteEntPath);
        } catch (err) {
          logError(`lstat() failed.\n  path: ${absoluteEntPath}\n  error: ${err}`);
          return;
        }

        // compute hash, using cache if available

        newTreefile.files.push({
          path: relativeEntPath,
          mtime: stat.mtime,
          size: stat.size,
          hash: 
        });

      } else {
        // ignore other file types.
      }
    }
  }
}

/**
 * @param {import('yargs').Arguments<{name: string}>} argv
 */
exports.update = async function(argv) {
  exports.updateInternal(argv.name);
}
