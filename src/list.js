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
  const dotpath = path.join(os.homedir(), '/.pismo/trees');

  let files;
  try {
    files = await readdirPromise(dotpath);
  } catch (err) {
    console.log('failed to read path: ' + dotpath);
    console.log(err);
    return;
  }

  let first = true;
  for (const file of files) {
    if (first) {
      first = false;
    } else {
      console.log();
    }

    const name = file.replace(/.json$/, '');
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
      console.log(`failed to parse tree file to json.\n  path: ${filepath}\n  error: ${err}`);
      return;
    }

    console.log(name);
    console.log(`  path: ${fileobject.path}`);
  }
}
