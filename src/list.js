const fs = require('fs');
const path = require('path');
const util = require('util');
const os = require('os');

const pismoutil = require('./pismoutil.js');

const readFilePromise = util.promisify(fs.readFile);
const readdirPromise = util.promisify(fs.readdir);

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

    const filepath = treeNamesToPaths[name];

    let filecontents;
    try {
      filecontents = await readFilePromise(filepath, 'utf8');
    } catch (err) {
      console.log('Failed to read tree file.');
      console.log('  filepath: ' + filepath);
      console.log('  error: ' + err);
      return;
    }

    let fileobject;
    try {
      fileobject = JSON.parse(filecontents);
    } catch (err) {
      console.log('Failed to parse tree file using JSON.parse().');
      console.log('  filepath: ' + filepath);
      console.log('  error: ' + err);
      return;
    }

    console.log(name);
    console.log('  path: ' + fileobject.path);
  }
}
