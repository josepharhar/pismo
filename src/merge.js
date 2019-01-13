const path = require('path');
const fs = require('fs');

const pismoutil = require('./pismoutil.js');
const {logInfo, logError} = pismoutil.getLogger(__filename);

/**
 * @param {import('yargs').Arguments} argv
 */
exports.merge = async function(argv) {
  const outputFilepath = argv['output-filepath'];

  const baseTree = await pismoutil.readTreeByName(argv.base);
  const otherTree = await pismoutil.readTreeByName(argv.other);

  // merge format will be a list of operations
  // each operation has:
  //   operator: rm, cp
  //   operands: one or two files, with specificity to base or other tree
}
