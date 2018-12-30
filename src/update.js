const fs = require('fs');
const path = require('path');
const os = require('os');

const pismoutil = require('./pismoutil.js');

const {logInfo, logError} = pismoutil.getLogger(path.basename(__filename));

class File {
  constructor(obj) {
  }
}

/**
 * @param {import('yargs').Arguments} argv
 */
exports.update = async function(argv) {
  const treesPath = pismoutil.getTreesPath();
}

exports.updateInternal = async function() {

}
