const fs = require('fs');
const path = require('path');
const os = require('os');

class File {
  constructor(obj) {
  }
}

/**
 * @param {import('yargs').Arguments} argv
 */
exports.update = async function(argv) {
  const dotpath = path.join(os.homedir(), '/.pismo/trees');
}
