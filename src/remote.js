const http = require('http');
const fs = require('fs');
const util = require('util');
const path = require('path');
const {URL} = require('url');
const stream = require('stream');

const progress = require('progress-stream');
const mkdirp = require('mkdirp');

const pismoutil = require('./pismoutil.js');
const api = require('./api.js');
const protocol = require('./gen/pismoRemoteProtocol.js');

const readdirPromise = util.promisify(fs.readdir);
const unlinkPromise = util.promisify(fs.unlink);
const writeFilePromise = util.promisify(fs.writeFile);
const {logInfo, logError} = pismoutil.getLogger(__filename);

/**
 * remotes directory structure:
 * .pismo/
 *   remotes/
 *     origin/
 *       meta.json
 *       trees/
 *         master.json
 *         pictures.json
 *     github/
 *       meta.json
 *       trees/
 *         rofl.json
 *         lol.json
 */

/**
 * Tracks metadata about a remote
 */
class Remote {
  /**
   * TODO make this only callable from getOrCreateRemote()
   * @param {string} name
   */
  constructor(name) {
    this._name = name;
    /** @type {string} */
    this._url = null;
    /** @type {number} */
    this._lastFetched = -1;
  }

  /**
   * Reads remotes/ dir to find all remotes and create Remote objects for them.
   * Does _not_ read from file to update them, though. Maybe make this an option?
   *
   * @return {!Promise<!Array<!Remote>>}
   */
  static async getAllRemotes() {
    /** @type {!Array<!Remote>} */
    const remotes = [];

    const absoluteRemotesPath = pismoutil.getAbsoluteRemotesPath();
    let dirents = null;
    try {
      await pismoutil.mkdirpPromise(absoluteRemotesPath);
      dirents = await readdirPromise(absoluteRemotesPath, {withFileTypes: true});
    } catch (error) {
      logError(`Remote.getAllRemotes() Failed to readdir() at absoluteRemotesPath: ${absoluteRemotesPath}`);
      throw error;
    }

    for (const dirent of dirents) {
      if (!dirent.isDirectory()) {
        logError(`Remote.getAllRemotes() remotes/${dirent.name} is not a directory, skipping...`);
        continue;
      }
      remotes.push(new Remote(dirent.name));
    }

    return remotes;
  }

  /**
   * @return {string}
   */
  name() {
    return this._name;
  }

  /**
   * @return {string}
   */
  url() {
    return this._url;
  }

  /**
   * @param {string} url
   */
  setUrl(url) {
    this._url = url;
  }

  /**
   * @return {number}
   */
  lastFetched() {
    return this._lastFetched;
  }

  updateTimestamp() {
    this._lastFetched = Math.floor(new Date().getTime() / 1000);
  }

  /**
   * @return {string}
   */
  dotPath() {
    return `/remotes/${this.name()}`;
  }

  /**
   * @return {string}
   */
  metaDotPath() {
    return `${this.dotPath()}/meta.json`;
  }

  /**
   * @return {string}
   */
  relativeTreesPath() {
    return path.join(this.dotPath(), 'trees');
  }

  /**
   * @return {string}
   */
  absoluteTreesPath() {
    return path.join(pismoutil.getDotPath(), this.relativeTreesPath());
  }

  /**
   * Returns tree filed within this remote mapped to their absolute filepaths.
   * Similar to pismoutil.getTreeNamesToPaths().
   * TODO merge with code in pismoutil.getTreeNamesToPaths()
   *
   * @return {!Promise<Object<string, string>>}
   */
  async getTreeNamesToPaths() {
    /** @type {Object<string, string>} */
    const output = {};
    const absoluteTreesPath = this.absoluteTreesPath();

    let filenames;
    try {
      await pismoutil.mkdirpPromise(absoluteTreesPath);
      filenames = await readdirPromise(absoluteTreesPath);
    } catch (error) {
      logError(`Remote.getTreeNamesToPaths() readdir(${absoluteTreesPath}) failed`);
      throw error;
    }

    for (const filename of filenames) {
      if (!filename.endsWith('.json')) {
        logError(`Found non-json file in /remotes/${this.name()}/trees: ${filename}`);
        continue;
      }

      const name = filename.replace(/.json$/, '');
      output[name] = path.join(absoluteTreesPath, filename);
    }
    return output;
  }

  /**
   * Reads a tree from file and returns the contents as a TreeFile.
   * TODO merge with pismoutil.readTreeByName()
   *
   * @param {string} treename
   * @return {!Promise<!pismoutil.TreeFile>}
   */
  async readTreeByName(treename) {
    const treeNamesToPaths = await this.getTreeNamesToPaths();
    const filepath = treeNamesToPaths[treename];
    if (!filepath)
      throw new Error(`Couldn't find a tree file named ${treename}`);
    try {
      return await pismoutil.readFileToJson(filepath);
    } catch (err) {
      logError(`Failed to read tree file named ${treename} at filepath ${filepath}`);
      throw err;
    }
  }

  async readFromFile() {
    let obj = null;
    try {
      obj = await pismoutil.readDotFileFromJson(this.metaDotPath());
    } catch (error) {
      logError(`Failed to read remote information from file. name: ${this.name()}`);
      throw error;
    }
    this._name = obj.name;
    this._url = obj.url;
    this._lastFetched = obj.lastFetched;
  }

  async writeToFile() {
    const obj = {
      name: this._name,
      url: this._url,
      lastFetched: this._lastFetched
    };
    try {
      await pismoutil.writeDotFile(this.metaDotPath(), obj);
    } catch (error) {
      logError(`Failed to write remote to file. name: ${this.name()}`);
      throw error;
    }
  }

  async delete() {
    await pismoutil.deleteDotPath(this.dotPath());
  }

  /**
   * @param {string} treename
   * @param {string} relativePath
   * @return {!Promise<!pismoutil.FileTime>}
   */
  async getRemoteFileTime(treename, relativePath) {
    /** @type {!protocol.GetFileTimeParams} */
    const request = {
      treename: treename,
      relativePath: relativePath
    };
    return await api.GetFileTime.fetchResponse(this, request);
  }

  /**
   * @param {string} treename
   * @param {string} relativePath
   * @param {!pismoutil.FileTime} filetime
   */
  async setRemoteFileTime(treename, relativePath, filetime) {
    /** @type {!protocol.SetFileTimeParams} */
    const request = {
      treename: treename,
      relativePath: relativePath,
      mtimeS: filetime.mtimeS,
      mtimeNs: filetime.mtimeNs
    };
    await api.SetFileTime.fetchResponse(this, request);
  }

  /**
   * @param {string} treeName
   * @param {string} relativePath
   * @param {string} absoluteLocalPath
   */
  async copyFileToRemote(treeName, relativePath, absoluteLocalPath) {
    const filesize = fs.statSync(absoluteLocalPath).size;
    /** @type {!protocol.PreparePutFileParams} */
    const request = {
      treename: treeName,
      relativePath: relativePath,
      filesize: filesize
    };
    const {putId} = await api.PreparePutFile.fetchResponse(this, request);

    const contentLength = fs.statSync(absoluteLocalPath).size;
    // TODO const fileReadStream = fs.createReadStream(absoluteLocalPath, {encoding: 'binary'});
    const fileReadStream = fs.createReadStream(absoluteLocalPath);

    console.log(`Sending "${absoluteLocalPath}" to remote "${relativePath}"`);
    const progressStream = progress({
        length: filesize,
        time: 1000 /* ms interval to print update */
      }, progress => {
        const numChars = Math.floor(progress.percentage / 20);
        let output = `\r[`;
        for (let i = 0; i < 20; i++) {
          if (i < numChars)
            output += '=';
          else
            output += ' ';
        }
        output += `] ${Math.floor(progress.percentage)}%\r`;
        process.stdout.write(output);
    });

    await api.PutFile.upload(this, putId,
      fileReadStream.pipe(progressStream),
      contentLength);
  }

  /**
   * @param {string} treeName
   * @param {string} relativePath
   * @param {string} absoluteLocalPath
   * @return {!Promise<void>}
   */
  copyFileFromRemote(treeName, relativePath, absoluteLocalPath) {
    return new Promise(async (resolve, reject) => {
      /** @type {!protocol.GetFileParams} */
      const request = {
        treename: treeName,
        relativePath: relativePath
      };

      await new Promise(resolve => {
        mkdirp(path.dirname(absoluteLocalPath), error => {
          resolve();
        })
      });
      const fileWriteStream = fs.createWriteStream(absoluteLocalPath);
      const requestReadStream = await api.GetFile.streamResponse(this, request);
      requestReadStream
        .on('error', error => {
          reject(new pismoutil.ErrorWrapper(error,
            `Failed to download file from remote. treeName: ${treeName}, relativePath: ${relativePath}, absoluteLocalPath: ${absoluteLocalPath}`));
        })
        .pipe(fileWriteStream);

      fileWriteStream.on('error', error => {
        reject(new pismoutil.ErrorWrapper(error,
          `Failed to write file downloaded from remote. treename: ${treeName}, relativePath: ${relativePath}, absoluteLocalPath: ${absoluteLocalPath}`));
      });

      // I think that if we get an error event then finish won't happen.
      fileWriteStream.on('finish', resolve);
    });
  }

  /**
   * @param {string} srcTreeName
   * @param {string} srcRelativePath
   * @param {string} destTreeName
   * @param {string} destRelativePath
   */
  async copyFileWithinRemote(srcTreeName, srcRelativePath, destTreeName, destRelativePath) {
    /** @type {!protocol.CopyWithinParams} */
    const request = {
      srcTreename: srcTreeName,
      srcRelativePath: srcRelativePath,
      destTreename: destTreeName,
      destRelativePath: destRelativePath
    };
    await api.CopyWithin.fetchResponse(this, request);
  }

  /**
   * @param {string} treename
   * @param {string} relativePath
   */
  async deleteRemoteFile(treename, relativePath) {
    /** @type {!protocol.DeleteFileParams} */
    const request = {
      treename: treename,
      relativePath: relativePath
    };
    await api.DeleteFile.fetchResponse(this, request);
  }
};
exports.Remote = Remote;

/** @type {!Map<string, !Remote>} */
const _remoteCache = new Map();
/**
 * TODO this function name is misleading, we are not actually creating a new remote!
 * Manages a cache layer to disk for remotes.
 * Returns a remote which has been updated from disk
 * @param {string} name
 * @return {!Promise<!Remote>}
 */
exports.getOrCreateRemote = async function(name) {
  let remote = _remoteCache.get(name);
  if (!remote) {
    remote = new Remote(name);
    await remote.readFromFile();
    _remoteCache.set(name, remote);
  }
  return remote;
}

/**
 * @param {import('./pismo.js').RemoteAddArgs} argv
 */
exports.remoteAdd = async function(argv) {
  const remote = new Remote(argv.name);
  remote.setUrl(argv.url);
  await remote.writeToFile();
}

/**
 * @param {import('./pismo.js').RemoteRemoveArgs} argv
 */
exports.remoteRemove = async function(argv) {
  const remote = new Remote(argv.name);
  await remote.readFromFile();

  try {
    await remote.delete();
  } catch (error) {
    logError(`Failed to delete remote named: ${argv.name}`);
    throw error;
  }
}

/**
 * Print out a list of all remotes to the console.
 *
 * @param {import('./pismo.js').RemoteListArgs} argv
 */
exports.remoteList = async function(argv) {
  if (argv._.length > 1) {
    // TODO this only exists because yargs.strict() doesn't do anything!!!
    //   yargs should take care of this logic but i dont know if it even can.
    throw new Error('too many args given, expected one. given: ' + JSON.stringify(argv._));
  }

  const remotes = await Remote.getAllRemotes();
  for (const remote of remotes) {
    await remote.readFromFile();
    console.log(remote.name());
    console.log(`  url: ${remote.url()}`);

    if (remote.lastFetched() < 0) {
      console.log('  lastFetched: never');
    } else {
      const date = pismoutil.epochToDate(remote.lastFetched())
      const dateString = pismoutil.dateToString(date);
      const diffString = pismoutil.timeElapsedToString(date);
      console.log(`  lastFetched: ${dateString} (${diffString})`);
    }
  }
}

/**
 * Download all of the tree files from the remote. Track them all as local branches like git.
 * Same as "git fetch <name>"
 *
 * @param {import('./pismo.js').RemoteUpdateArgs} argv
 */
exports.remoteUpdate = async function(argv) {

//  const requestOptions = {
//    hostname: 'localhost',
//    port: 48880,
//    path: '/fileupload',
//    method: 'POST',
//    headers: {
//      'connection': 'keep-alive',
//      'x-pismo-length': stats.size
//      //'content-length': stats.size,
//      //'content-type': 'application/octet-stream',
//      //'connection': 'keep-alive',
//      //'transfer-encoding': 'chunked'/*,
//      //'x-pismo-length': stats.size*/
//    }
//  };
//  const request = http.request(requestOptions, async res => {
//    console.log(`${res.statusCode} ${JSON.stringify(res.headers, null, 2)}`);
//    try {
//      const str = await streamToString(res);
//      console.log('response body: ' + str);
//    } catch (error) {
//      console.log('response read error: ' + error);
//    }
//  });


//  // TODO use the caching layer here
//  const remote = new Remote(argv.name);
//  await remote.readFromFile();
//  const url = new URL(remote.url());
//  const requestOptions = {
//    hostname: url.hostname,
//    port: url.port,
//    path: '/api',
//    method: 'POST',
//    headers: {
//      'content-type': 'application/json',
//      'connection': 'keep-alive'
//    }
//  };
//  const postObj = {
//    method: 'list',
//    params: {}
//  };
//
//  const res = await new Promise((resolve, reject) => {
//    // TODO should remote.url() even be used here?
//    const req = http.request(remote.url(), requestOptions, resolve);
//    req.on('error', error => {
//      logError(`http.request error`);
//      reject(error);
//    });
//    req.write(JSON.stringify(postObj, null, 2));
//    req.end();
//  });
//
//  console.log(`${res.statusCode} ${JSON.stringify(res.headers, null, 2)}`);
//
//  let responseBody = null;
//  try {
//    responseBody = await pismoutil.streamToString(res);
//  } catch (error) {
//    logError(`Failed to read http response stream to string. url: ${remote.url()}`);
//    throw error;
//  }
//
//  if (Math.floor(res.statusCode / 100) !== 2) {
//    logError(`Remote failed with response body:\n${responseBody}`);
//  }
//
//  /** @type {!Object<string, !pismoutil.TreeFile>} */
//  let response = null;
//  try {
//    response = JSON.parse(responseBody);
//  } catch (error) {
//    logError(`Failed to parse response body to json`);
//    throw error;
//  }

  const remote = await exports.getOrCreateRemote(argv.name);
  if (!remote) {
    throw new Error(`unable to find remote with name: ${argv.name}`);
  }
  let response = await api.GetTrees.fetchResponse(remote);

  console.log(`updaing remotes/${remote.name()}/ with ${Object.keys(response).length} new trees`);

  const absoluteTreesPath = remote.absoluteTreesPath();
  await pismoutil.mkdirpPromise(absoluteTreesPath);

  console.log('argv.prune: ' + argv.prune);
  if (argv.prune) {
    console.log('pruning local things');
    const treeNamesToPaths = await remote.getTreeNamesToPaths();
    for (const name in treeNamesToPaths) {
      console.log(`  deleting ${name} at ${treeNamesToPaths[name]}`);
      await unlinkPromise(treeNamesToPaths[name]);
    }
  }


  // TODO share more code with add.js and stuff to do this?
  for (const {treename, treefile} of response.trees) {
    console.log(`name: ${treename}`);
    console.log(`  lastUpdated: ${treefile.lastUpdated}`);
    const absoluteNewTreePath = path.join(absoluteTreesPath, treename + '.json');
    try {
      writeFilePromise(absoluteNewTreePath, JSON.stringify(treefile, null, 2));
    } catch (error) {
      throw new pismoutil.ErrorWrapper(error, `Failed to write downloaded tree to path: ${absoluteNewTreePath}`);
    }
    console.log(`  wrote to file successfully!`);
  }


//  // save response stuff to local files
//  // TODO share more code with add.js and stuff to do this?
//  for (const name in response) {
//    const treeFile = response[name];
//    console.log(`name: ${name}`);
//    console.log(`  lastUpdated: ${treeFile.lastUpdated}`);
//    const absoluteNewTreePath = path.join(absoluteTreesPath, name + '.json');
//    try {
//      await writeFilePromise(absoluteNewTreePath, JSON.stringify(treeFile, null, 2));
//    } catch (error) {
//      logError(`Failed to write downloaded tree to path: ${absoluteNewTreePath}`);
//      throw error;
//    }
//    console.log('  wrote to file successfully!');
//  }

  remote.updateTimestamp();
  await remote.writeToFile();
}
