const path = require('path');
const os = require('os');
const fs = require('fs');

const mkdirp = require('mkdirp');

/**
 * @param {import('yargs').Arguments} argv
 */
exports.add = async function(argv) {
  console.log(`Adding tree named ${argv.name} rooted at ${argv.path}`);

  const dotpath = path.join(os.homedir(), '/.pismo/trees');

  const mkdirpErr = await new Promise(resolve => {
    mkdirp(dotpath, resolve);
  });
  if (mkdirpErr) {
    console.log(`mkdirp() failed.\n  dotpath: ${dotpath}\n  error: ${mkdirpErr}`);
    return;
  }

  const filepath = path.join(dotpath, `/${argv.name}.json`);

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
