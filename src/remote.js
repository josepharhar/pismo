const http = require('http');
const fs = require('fs');

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
 * Returns the directory path relative to the dotpath of a remote.
 *
 * @param {string} name
 * @return {string}
 */
function remoteNameToDotPath(name) {
  return `/remotes/${name}`;
}

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
    const obj = pismoutil.readDotFileFromJson(this.metaDotPath());
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
    await pismoutil.writeDotFile(this.metaDotPath(), obj);
  }
};

/**
 * @param {import('yargs').Arguments} argv
 */
exports.remoteAdd = async function(argv) {
  const remoteDotPath = remoteNameToDotPath(argv.name);

  const remoteJson = JSON.stringify({
    name: argv.name,
    url: argv.url,
    lastFetched: 'never'
  }, null, 2);

  try {
    await pismoutil.writeDotFile(remoteDotPath, remoteJson);
  } catch (error) {
    logError(`Failed to write new remote at path: ${remote.dotPath()}`);
    throw error;
  }
}

/**
 * @param {import('yargs').Arguments} argv
 */
exports.remoteRemove = async function(argv) {
  const remoteDotPath = remoteNameToDotPath(argv.name);
  try {
    await pismoutil.deleteDotPath(remoteDotPath);
  } catch (error) {
    logError(`Failed to remove remote named ${argv.name} at dotpath ${remoteDotPath}`);
    throw error;
  }
}

/**
 * Print out a list of all remotes to the console.
 *
 * @param {import('yargs').Arguments} argv
 */
exports.remoteList = async function(argv) {
  const remoteDotPath = remoteNameToDotPath(argv.name);

  try {
    await pismoutil.readDotFile
}

/**
 * Download all of the tree files from the remote. Track them all as local branches like git.
 *
 * @param {import('yargs').Arguments} argv
 */
exports.remoteUpdate = async function(argv) {

  const requestOptions = {
    hostname: 'localhost',
    port: 48880,
    path: '/fileupload',
    method: 'POST',
    headers: {
      'connection': 'keep-alive',
      'x-pismo-length': stats.size
      //'content-length': stats.size,
      //'content-type': 'application/octet-stream',
      //'connection': 'keep-alive',
      //'transfer-encoding': 'chunked'/*,
      //'x-pismo-length': stats.size*/
    }
  };
  const request = http.request(requestOptions, async res => {
    console.log(`${res.statusCode} ${JSON.stringify(res.headers, null, 2)}`);
    try {
      const str = await streamToString(res);
      console.log('response body: ' + str);
    } catch (error) {
      console.log('response read error: ' + error);
    }
  });

}
