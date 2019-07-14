const fs = require('fs');
const path = require('path');
const os = require('os');
const util = require('util');
const crypto = require('crypto');
const events = require('events');
const stream = require('stream');

// @ts-ignore
const nanostat = require('nanostat');
const progressStream = require('progress-stream');

const pismoutil = require('./pismoutil.js');
const diff = require('./diff.js');
//const {TreeFile} = require('./treefile.js');
const merge = require('./merge.js');

const readFilePromise = util.promisify(fs.readFile);
const readdirPromise = util.promisify(fs.readdir);
const {logInfo, logError} = pismoutil.getLogger(__filename);

class CancelError extends Error {
  constructor(message) {
    super(message);
  }
}

/**
 * @param {!string} absoluteFilepath
 * @param {!events.EventEmitter} cancelEmitter
 */
async function genHash(absoluteFilepath, cancelEmitter) {
  return new Promise((_resolve, _reject) => {
    function cancelHandler() {
      const error = new CancelError('hash generation cancelled');
      input.destroy(error);
      reject(error);
    }
    function resolve(data) {
      cancelEmitter.removeListener('cancel', cancelHandler);
      _resolve(data);
    }
    function reject(data) {
      cancelEmitter.removeListener('cancel', cancelHandler);
      _reject(data);
    }
    cancelEmitter.on('cancel', cancelHandler);

    const hash = crypto.createHash('md5');
    const input = fs.createReadStream(absoluteFilepath);
    input.on('error', reject);

    hash.once('readable', () => {
      console.log(); // progress is done, so print a newline so we dont overwrite that line
      resolve(hash.read().toString('hex'))
    });

    const filesize = fs.statSync(absoluteFilepath).size;
    const progress = progressStream({
      length: filesize,
      time: 100 /* ms */
    })
    progress.on('progress', progress => {
      const numChars = Math.floor(progress.percentage / 10);
      let output = `\rComputing hash [`;
      for (let i = 0; i < 10; i++) {
        if (i < numChars)
          output += '=';
        else
          output += ' ';
      }
      output += `] ${Math.floor(progress.percentage)}% for "${absoluteFilepath}"`;
      process.stdout.write(output);
    })

    input.pipe(progress).pipe(hash);
  });
}

/** @typedef {pismoutil.FileInfo} FileInfo */
/** @typedef {pismoutil.TreeFile} TreeFile */

/**
 * Takes one entry off pathStack and scans it, adding more if found.
 *
 * @param {!string} relativePathToScan
 * @param {!function(!string) : void} addPathToScan
 * @param {!function(!FileInfo) : void} addFileInfo
 * @param {!string} basepath
 * @param {!Object<string, FileInfo>} fileinfoCache
 * @param {!events.EventEmitter} cancelEmitter
 */
async function scanPath(
    relativePathToScan, addPathToScan, addFileInfo, basepath, fileinfoCache, cancelEmitter) {
  const absolutePathToScan = path.join(basepath, relativePathToScan);

  let dirents;
  try {
    dirents = await new Promise((resolve, reject) => {
      fs.readdir(absolutePathToScan, {withFileTypes: true}, (err, files) => {
        if (err)
          reject(err);
        resolve(files);
      });
      cancelEmitter.on('cancel', () => reject(new CancelError('readdir was cancelled')));
    });
  } catch (error) {
    if (error instanceof CancelError) {
      return;
    } else {
      logError(`readdir() failed. path: ${absolutePathToScan}`);
      throw error;
    }
  }

  for (const dirent of dirents) {
    const relativeEntPath = path.join(relativePathToScan, dirent.name);
    const unixRelativeEntPath = relativeEntPath.replace(/\\/g, '/'); // TODO this sounds scary
    const absoluteEntPath = path.join(basepath, relativeEntPath);

    if (dirent.isDirectory()) {
      addPathToScan(relativeEntPath);

    } else if (dirent.isFile()) {
      let stat;
      try {
        //stat = nanostat.lstatSync(absoluteEntPath);
        stat = nanostat.statSync(absoluteEntPath);
      } catch (err) {
        logError(`lstat() failed. path: ${absoluteEntPath}`);
        throw err;
      }

      /** @type {!pismoutil.FileInfo} */
      const newFileInfo = {
        path: unixRelativeEntPath,
        mtimeS: Number(stat.mtimeMs / 1000n),
        mtimeNs: Number(stat.mtimeNs),
        size: Number(stat.size),
        hash: null
      };

      // compute hash, using cache if available
      const cachedFileinfo = fileinfoCache[unixRelativeEntPath];
      if (cachedFileinfo
          && cachedFileinfo.mtimeS === newFileInfo.mtimeS
          && cachedFileinfo.mtimeNs === newFileInfo.mtimeNs
          && cachedFileinfo.size === newFileInfo.size) {
        newFileInfo.hash = cachedFileinfo.hash;
        console.log(`Reusing cached hash for ${newFileInfo.path}`);

      } else {
        // recompute hash
        try {
          newFileInfo.hash = await genHash(absoluteEntPath, cancelEmitter);
        } catch (error) {
          if (error instanceof CancelError)
            return;
          else
            throw error;
        }
      }

      addFileInfo(newFileInfo);

    } else {
      // ignore other file types.
    }
  }
}

/**
 * @param {!string} name
 * @param {boolean} nocache
 */
exports.updateInternal = async function(name, nocache) {
  const treefilepath = (await pismoutil.getTreeNamesToPaths())[name];
  if (!treefilepath)
    throw new Error('Failed to find tree with name: ' + name);

  /** @type {TreeFile} */
  const oldTreefile = await pismoutil.readFileToJson(treefilepath);
  if (!oldTreefile) {
    throw new Error('Failed to read tree json file for name: ' + name);
  }
  // TODO verifyTreeFile(treefile); - file could be missing the fields we want
  
  /** @type {!TreeFile} */
  let newTreefile = {
    path: oldTreefile.path,
    lastUpdated: Math.floor(new Date().getTime() / 1000),
    files: []
  };

  /** @type {!Object<string, FileInfo>} */
  const fileinfoCache = {};
  if (!nocache) {
    for (const fileinfo of oldTreefile.files) {
      fileinfoCache[fileinfo.path] = fileinfo;
    }
  }

  const cancelEmitter = new events.EventEmitter();

  let gotSigint = false;
  process.on('SIGINT', () => {
    console.log('\nreceived sigint, writing updates to file...');
    if (gotSigint)
      return;
    gotSigint = true;

    // if we are building fileinfo, then just stop and write it to disk.
    // if we are writing the fileinfo, then we need to make sure that we keep writing it...?
    // by implementing this handler, i think that means sigint wont kill the program anymore.

    // we have to be able to cancel callbacks?
    cancelEmitter.emit('cancel');
  });

  const basepath = oldTreefile.path;

  // depth first - explore tree using a stack
  const pathsToScan = [];
  pathsToScan.push('/');
  while (pathsToScan.length && !gotSigint) {
    try {
      await scanPath(
        pathsToScan.pop(),
        newPathToScan => pathsToScan.push(newPathToScan),
        newFileInfo => newTreefile.files.push(newFileInfo),
        basepath,
        fileinfoCache,
        cancelEmitter);
      } catch (error) {
        logError('got error while updating:' + error);
        logError('writing the stuff we got to file.');
        gotSigint = true;
      }
    cancelEmitter.removeAllListeners();
  }

  newTreefile.files.sort(pismoutil.fileInfoComparator);

  if (gotSigint) {
    // if the update was interrupted, then
    // we shouldn't overwrite files we are already tracking because we don't
    // know for sure if they were deleted yet
    newTreefile.files = merge.oneWayUpdate(newTreefile, oldTreefile)
  }

  const writeFileError = await new Promise(resolve => {
    fs.writeFile(treefilepath, JSON.stringify(newTreefile, null, 2), resolve);
  });
  if (writeFileError) {
    logError(`Failed to write updated tree file to path: ${treefilepath}`);
    throw writeFileError;
  }

  diff.diffTrees(newTreefile, oldTreefile);

  if (gotSigint)
    console.log(`Successfully partially updated tree "${name}"`);
  else
    console.log(`Successfully completely updated tree "${name}"`);
}

/**
 * @param {import('./pismo.js').UpdateArgs} argv
 */
exports.update = async function(argv) {
  await exports.updateInternal(argv.name, argv.nocache);
}
