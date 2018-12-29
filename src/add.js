const path = require('path');
const os = require('os');
const fs = require('fs');

/**
 * @param {import('yargs').Arguments} argv
 */
exports.add = async function(argv) {
  const name = argv.name;
  const path = argv.path;
  const noupdate = argv.noupdate;

  console.log(`Adding tree named ${name} rooted at ${path}`);

  const dotpath = path.join(os.homedir(), '/.pismo/trees');

  const filepath = path.join(dotpath, `/${name}.json`);

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
    path: path
  };
  const writeFileError = await new Promise(resolve => {
    fs.writeFile(filepath, JSON.stringify(newTree, null, 2), resolve);
  });
  if (writeFileError) {
    console.log(`Failed to write new tree to path: ${filepath} err: ${writeFileError}`);
    return;
  }

  // TODO call scan or not based on argv.noupdate
}
