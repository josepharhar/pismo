const http = require('http');
const fs = require('fs');
const util = require('util');
const path = require('path');
const {URL} = require('url');

const pismoutil = require('./pismoutil.js');
const api = require('./api.js');

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
    /** @type {string} */
    this._lastUpdated = 'never';
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
   * @return {string}
   */
  lastUpdated() {
    return this._lastUpdated;
  }

  updateTimestamp() {
    this._lastUpdated = new Date().toISOString();
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
    this._lastUpdated = obj.lastUpdated;
  }

  async writeToFile() {
    const obj = {
      name: this._name,
      url: this._url,
      lastUpdated: this._lastUpdated
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
    /** @type {!api.GetFileTimeParams} */
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
    /** @type {!api.SetFileTimeParams} */
    const request = {
      treename: treename,
      relativePath: relativePath,
      mtimeS: filetime.mtimeS,
      mtimeNs: filetime.mtimeNs
    };
    await api.SetFileTime.fetchResponse(this, request);
  }

  /**
   * @param {string} absoluteLocalPath
   * @param {string} treeName
   * @param {string} relativePath
   */
  async copyFileToRemote(absoluteLocalPath, treeName, relativePath) {
    /** @type {!api.PreparePutFileParams} */
    const request = {
      treename: treeName,
      relativePath: relativePath
    };
    const {putId} = await api.PreparePutFile.fetchResponse(this, request);

    await api.PutFile.upload(this, putId, fs.createReadStream(absoluteLocalPath, {
      encoding: 'binary'
    }));
  }

  /**
   * @param {string} treeName
   * @param {string} relativePath
   * @param {string} absoluteLocalPath
   * @return {!Promise<void>}
   */
  copyFileFromRemote(treeName, relativePath, absoluteLocalPath) {
    return new Promise(async (resolve, reject) => {
      /** @type {!api.GetFileParams} */
      const request = {
        treename: treeName,
        relativePath: relativePath
      };

      const fileWriteStream = fs.createWriteStream(absoluteLocalPath);
      const requestReadStream = await api.GetFile.streamResponse(this, request);
      requestReadStream
        .on('error', error => {
          reject(new pismoutil.ErrorWrapper(error,
            `Failed to download file from remote. treeName: ${treeName}, relativePath: ${relativePath}, absoluteLocalPath: ${absoluteLocalPath}`));
        })
        .pipe(fileWriteStream);

      // I think that if we get an error event then finish won't happen.
      requestReadStream.on('finish', resolve);
    });
  }

  /**
   * @param {string} srcTreeName
   * @param {string} srcRelativePath
   * @param {string} destTreeName
   * @param {string} destRelativePath
   */
  async copyFileWithinRemote(srcTreeName, srcRelativePath, destTreeName, destRelativePath) {
    /** @type {!api.CopyWithinParams} */
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
    /** @type {!api.DeleteFileParams} */
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
 * @param {import('yargs').Arguments} argv
 */
exports.remoteAdd = async function(argv) {
  const remote = new Remote(argv.name);
  remote.setUrl(argv.url);
  await remote.writeToFile();
}

/**
 * @param {import('yargs').Arguments} argv
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
 * @param {import('yargs').Arguments} argv
 */
exports.remoteList = async function(argv) {
  const remotes = await Remote.getAllRemotes();
  for (const remote of remotes) {
    await remote.readFromFile();
    console.log(remote.name());
    console.log(`  url: ${remote.url()}`);
    console.log(`  lastUpdated: ${remote.lastUpdated()}`);
  }
}

/**
 * Download all of the tree files from the remote. Track them all as local branches like git.
 * Same as "git fetch <name>"
 *
 * @param {import('yargs').Arguments} argv
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

  // TODO use the caching layer here
  const remote = new Remote(argv.name);
  await remote.readFromFile();

  const url = new URL(remote.url());
  const requestOptions = {
    hostname: url.hostname,
    port: url.port,
    path: '/api',
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    }
  };
  const postObj = {
    method: 'list',
    params: {}
  };

  const res = await new Promise((resolve, reject) => {
    const req = http.request(remote.url(), requestOptions, resolve);
    req.on('error', error => {
      logError(`http.request error`);
      reject(error);
    });
    req.write(JSON.stringify(postObj, null, 2));
    req.end();
  });

  console.log(`${res.statusCode} ${JSON.stringify(res.headers, null, 2)}`);
  let responseBody = null;
  try {
    responseBody = await pismoutil.streamToString(res);
  } catch (error) {
    logError(`Failed to read http response stream to string. url: ${remote.url()}`);
    throw error;
  }

  /** @type {!Object<string, !pismoutil.TreeFile>} */
  let response = null;
  try {
    response = JSON.parse(responseBody);
  } catch (error) {
    logError(`Failed to parse response body to json`);
    throw error;
  }

  console.log(`updaing remotes/${remote.name()}/ with ${Object.keys(response).length} new trees`);

  const absoluteTreesPath = remote.absoluteTreesPath();
  await pismoutil.mkdirpPromise(absoluteTreesPath);

  console.log('argv.prune: ' + argv.prune);
  if (argv.prune) {
    console.log('pruning local things');
    const treeNamesToPaths = remote.getTreeNamesToPaths();
    for (const name in treeNamesToPaths) {
      console.log(`  deleting ${name} at ${treeNamesToPaths[name]}`);
      await unlinkPromise(treeNamesToPaths[name]);
    }
  }

  // save response stuff to local files
  // TODO share more code with add.js and stuff to do this?
  for (const name in response) {
    const treeFile = response[name];
    console.log(`name: ${name}`);
    console.log(`  lastModified: ${treeFile.lastModified}`);
    const absoluteNewTreePath = path.join(absoluteTreesPath, name + '.json');
    try {
      await writeFilePromise(absoluteNewTreePath, JSON.stringify(treeFile, null, 2));
    } catch (error) {
      logError(`Failed to write downloaded tree to path: ${absoluteNewTreePath}`);
      throw error;
    }
    console.log('  wrote to file successfully!');
  }

  remote.updateTimestamp();
  await remote.writeToFile();
}
