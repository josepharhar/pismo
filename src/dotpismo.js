const path = require('path');
const fs = require('fs');
const util = require('util');

const readdir = util.promisify(fs.readdir);

let dotpath = path.join(process.env.HOME, '.pismo');
console.log('initialized dotpath to ' + dotpath + ', should only happen once!');

/**
 * @param {!string} name
 * @return {?string}
 */
exports.getPathForName = async function(name) {
  let dir_filenames;
  try {
    dir_filenames = await readdir(dotpath);
  } catch (e) {
    console.log('getPathForName failed to readdir at dotpath: ' + dotpath);
    return null;
  }

  console.log('TODO delet this getPathForName dir_filenames: ' + JSON.stringify(dir_filenames));

  // remove .json
  const json_filenames = dir_filenames
    .filter(filename => filename.match(/.json$/))
    .map(filename => filename.replace(/.json$/, ''));

  console.log('TODO delet this json_filenames: ' + JSON.stringify(json_filenames));
}
