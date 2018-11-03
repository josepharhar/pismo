const fs = require('fs');
const path = require('path');
const util = require('util');
const crypto = require('crypto');

const readFile = util.promisify(fs.readFile);
const readdir = util.promisify(fs.readdir);
const lstat = util.promisify(fs.lstat);
const writeFile = util.promisify(fs.writeFile);

async function main() {
  function printUsageAndExit() {
    console.log('usage: node diff.js <head.js> <other.js>');
  }

  if (process.argv.length != 4) {
    printUsageAndExit();
  }

  const headpath = path.resolve(process.argv[2]);
  const otherpath = path.resolve(process.argv[3]);
}

main().catch(error => {
  console.log('caught error:');
  console.log(error);
});
