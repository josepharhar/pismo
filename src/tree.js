const fs = require('fs');
const path = require('path');
const util = require('util');

const mkdirp = require('mkdirp');

const pismoutil = require('./pismoutil.js');

const readFilePromise = util.promisify(fs.readFile);
const readdirPromise = util.promisify(fs.readdir);
const {logInfo, logError} = pismoutil.getLogger(__filename);

class Tree {
  /**
   * @param {string} name
   */
  constructor(name) {
    this._name = name;
    /** @type {number} */
    this._lastUpdated = null;
  }

  /**
   * @return {string}
   */
  name() {
    return this._name;
  }

  /**
   * @return {number}
   */
  lastUpdatedAsEpoch() {
    return this._lastUpdated;
  }

  /**
   * @return {?Date}
   */
  lastUpdatedAsDate() {
    if (!this._lastUpdated)
      return null;
    return new Date(this._lastUpdated * 1000)
  }

  /**
   * @return {string}
   */
  dotPath() {
    return `/remotes/${this.name()}`;
  }
};
exports.Tree = Tree;

/**
 * @param {import('yargs').Arguments} argv
 */
exports.add = async function(argv) {
  const absolutePath = path.resolve(process.cwd(), argv.path);

  logInfo(`Adding tree named ${argv.name} rooted at ${absolutePath}`);

  const treesPath = pismoutil.getTreesPath();

  const mkdirpErr = await new Promise(resolve => {
    mkdirp(treesPath, resolve);
  });
  if (mkdirpErr) {
    logError(`mkdirp() failed.\n  treesPath: ${treesPath}\n  error: ${mkdirpErr}`);
    return;
  }

  const filepath = path.join(treesPath, `/${argv.name}.json`);

  // check if a tree with the given name exists already
  const accessErr = await new Promise(resolve => {
    fs.access(filepath, fs.constants.F_OK, resolve);
  });
  if (!accessErr) {
    logInfo(`Tree file already exists at path: ${filepath}`);
    return;
  }

  // write the new tree to the specified filepath
  const newTree = {
    path: absolutePath,
    lastModified: '', // TODO set lastModified
    files: []
  };
  const writeFileError = await new Promise(resolve => {
    fs.writeFile(filepath, JSON.stringify(newTree, null, 2), resolve);
  });
  if (writeFileError) {
    logError(`Failed to write new tree to filepath: ${filepath}`);
    throw writeFileError;
  }

  // TODO call scan or not based on argv.noupdate (also update lastUpdated accordingly)
}

/**
 * @param {import('yargs').Arguments} argv
 */
exports.remove = async function(argv) {
  const treesPath = pismoutil.getTreesPath();

  const filepath = path.join(treesPath, `/${argv.name}.json`);

  // check if a tree file with the given name exists
  const accessErr = await new Promise(resolve => {
    fs.access(filepath, fs.constants.F_OK, resolve);
  });
  if (accessErr) {
    logError(`No tree file named ${argv.name} found at ${filepath}`);
    throw accessErr;
  }

  const unlinkErr = await new Promise(resolve => {
    fs.unlink(filepath, resolve);
  });
  if (unlinkErr) {
    logError(`Failed to delete tree file named ${argv.name} located at ${filepath}`);
    throw unlinkErr;
  }

  logInfo(`Successfully deleted tree file named ${argv.name} located at ${filepath}`);
}

/**
 * @param {import('yargs').Arguments} argv
 */
exports.list = async function(argv) {
  const treeNamesToPaths = await pismoutil.getTreeNamesToPaths();

  let first = true;
  for (const name in treeNamesToPaths) {
    if (first)
      first = false;
    else
      console.log();

    /** @type {!pismoutil.TreeFile} */
    const tree = await pismoutil.readFileToJson(
      treeNamesToPaths[name]);
    if (tree === null) {
      logError('Failed to read tree json file for name: ' + name);
      return;
    }
    console.log(name);
    console.log('  path: ' + tree.path);
    console.log('  lastUpdated: ' + tree.lastUpdated);
  }
}
