const path = require('path');
const fs = require('fs');

const mkdirp = require('mkdirp');

const pismoutil = require('./pismoutil.js');
const {logInfo, logError} = pismoutil.getLogger(__filename);

/**
 * @param {import('./pismo.js').AddArgs} argv
 */
exports.add = async function(argv) {
  const absolutePath = path.resolve(process.cwd(), argv.path);

  if (argv.name.includes('/') || argv.name.includes('\\')) {
    logError(`Invalid new tree name. must not include '/' or '\\'`);
    return;
  }

  logInfo(`Adding tree named ${argv.name} rooted at ${absolutePath}`);

  const treesPath = pismoutil.getAbsoluteTreesPath();

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
  /** @type {!pismoutil.TreeFile} */
  const newTree = {
    path: absolutePath,
    lastUpdated: -1,
    files: []
  };
  const writeFileError = await new Promise(resolve => {
    fs.writeFile(filepath, JSON.stringify(newTree, null, 2), resolve);
  });
  if (writeFileError) {
    logError(`Failed to write new tree to filepath: ${filepath}`);
    throw writeFileError;
  }

  // TODO call scan or not based on argv.noupdate
}

export {};
