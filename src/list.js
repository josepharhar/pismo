const fs = require('fs');
const path = require('path');
const util = require('util');
const os = require('os');
const readFilePromise = util.promisify(fs.readFile);
const readdirPromise = util.promisify(fs.readdir);

/**
 * @param {import('yargs').Arguments} argv
 */
exports.list = async function(argv) {
  console.log('list.js argv: ' + JSON.stringify(argv, null, 2));

  const dotpath = path.join(os.homedir(), '/.pismo/trees');

  let files;
  try {
    files = await readdirPromise(dotpath);
  } catch (err) {
    console.log('failed to read path: ' + dotpath);
    console.log(err);
    return;
  }

  for (const file of files) {
    const filepath = path.join(dotpath, file);
    let filecontents;
    try {
      filecontents = await readFilePromise(filepath, 'utf8');
    } catch (err) {
      console.log('failed to read file: ' + filepath);
      console.log(err);
      return;
    }

    let fileobject;
    try {
      fileobject = JSON.parse(filecontents);
    } catch (err) {
      console.log('failed to parse file to json: ' + filepath);
      console.log(err);
      return;
    }

    if (!fileobject.name) {
      console.log('tree file has no name field: ' + filepath);
      return;
    }

    console.log(fileobject.name);
  }
}
