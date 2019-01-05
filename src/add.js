const path = require('path');
const fs = require('fs');

const mkdirp = require('mkdirp');

const pismoutil = require('./pismoutil.js');

/**
 * @param {import('yargs').Arguments<{noupdate: boolean}>} argv
 */
exports.add = async function(argv) {
  console.log(`Adding tree named ${argv.name} rooted at ${argv.path}`);

  const treesPath = pismoutil.getTreesPath();

  const mkdirpErr = await new Promise(resolve => {
    mkdirp(treesPath, resolve);
  });
  if (mkdirpErr) {
    console.log(`mkdirp() failed.\n  treesPath: ${treesPath}\n  error: ${mkdirpErr}`);
    return;
  }

  const filepath = path.join(treesPath, `/${argv.name}.json`);

  // check if a tree with the given name exists already
  const accessErr = await new Promise(resolve => {
    fs.access(filepath, fs.constants.F_OK, resolve);
  });
  if (!accessErr) {
    console.log(`Tree file already exists at path: ${filepath}`);
    return;
  }

  // write the new tree to the specified filepath
  const newTree = {
    path: argv.path
  };
  const writeFileError = await new Promise(resolve => {
    fs.writeFile(filepath, JSON.stringify(newTree, null, 2), resolve);
  });
  if (writeFileError) {
    console.log(`Failed to write new tree.\n  path: ${filepath}\n  err: ${writeFileError}`);
    return;
  }

  // TODO call scan or not based on argv.noupdate
}
