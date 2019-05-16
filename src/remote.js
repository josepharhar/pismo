const http = require('http');
const fs = require('fs');
const util = require('util');

const pismoutil = require('./pismoutil.js');

const readdirPromise = util.promisify(fs.readdir);
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
    return `/remotes/${name}`;
  }

  /**
   * @return {string}
   */
  metaDotPath() {
    return `${this.dotPath()}/meta.json`;
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
};

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
  // iterate over the directories in remotes/, print out the meta.json of each.
  
  const absolutePath = pismoutil.getAbsoluteRemotesPath();
  let dirents = null;
  try {
    dirents = await readdirPromise(absolutePath, {withFileTypes: true});
  } catch (error) {
    logError(`Failed to readdir() to list remotes at path: ${absolutePath}`);
    throw error;
  }

  for (const dirent of dirents) {
    if (!dirent.isDirectory()) {
      logError(`remotes/${dirent.name} is not a directory, skipping...`);
      continue;
    }
    const remote = new Remote(dirent.name);
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

  const req = http.request(remote.url(), requestOptions, async res => {
    console.log(`${res.statusCode} ${JSON.stringify(res.headers, null, 2)}`);
    try {
      const str = await pismoutil.streamToString(res);
      console.log('http response body:');
      console.log(str);
    } catch (error) {
      logError(`Failed to read http response stream to string. url: ${remote.url()}`);
      throw error;
    }
  });
  req.write(JSON.stringify(postObj, null, 2));
  req.end();
}
