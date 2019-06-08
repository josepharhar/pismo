const path = require('path');
const fs = require('fs');

const pismoutil = require('./pismoutil.js');

const {logInfo, logError} = pismoutil.getLogger(__filename);

/**
 * @param {import('./pismo.js').RemoveArgs} argv
 */
exports.remove = async function(argv) {
  const treesPath = pismoutil.getAbsoluteTreesPath();

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
