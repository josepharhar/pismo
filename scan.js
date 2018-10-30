const fs = require('fs');
const path = require('path');
const util = require('util');

const readFile = util.promisify(fs.readFile);
const readdir = util.promisify(fs.readdir);
const lstat = util.promisify(fs.lstat);
const writeFile = util.promisify(fs.writeFile);

async function main() {
  console.log('process.argv: ' + JSON.stringify(process.argv));

  function printUsageAndExit() {
    console.log('usage: node scan.js gen </path/to/scandir>');
    console.log('       node scan.js update <file.json>');
    process.exit(1);
  }

  if (process.argv.length != 4) {
    printUsageAndExit();
  }

  const mode = process.argv[2];
  const argpath = process.argv[3];
  switch (mode.toLowerCase()) {
    case 'gen':
      await gen(argpath);
      break;
    case 'update':
      await update(argpath);
      break;
    default:
      console.log('unrecognized mode: ' + mode);
      process.exit(1);
      break;
  }
}

/**
 * @param {!string} basepath
 */
async function gen(basepath) {
  const basepath = path.resolve(process.argv[2]);
  if (!path.isAbsolute(basepath)) {
    console.log('Provided path must be absolute. given: ' + basepath);
    process.exit(1);
  }

  const file_info_array = [];
  await scandir(basepath, '/', file_info_array);

  const output = {
    'basepath': basepath,
    'file_info_array': file_info_array
  };
  await writeFile('output.json', JSON.stringify(output, null, 2));
}

/**
 * @param {!string} filepath
 */
async function update(filepath) {
  const stat = await lstat(filepath);
  throw new Error('update not implemented yet');
}

/**
 * @param {!string} basepath Platform specific absolute path
 * @param {!string} relative_dirpath Path relative to basepath
 * @param {!Array<FileInfo>} file_info_array
 */
async function scandir(basepath, relative_dirpath, file_info_array) {
  const absolute_dirpath = path.join(basepath, relative_dirpath);
  const dir_filenames = await readdir(absolute_dirpath);
  console.log('basepath: ' + basepath
    + ', relative_dirpath: ' + relative_dirpath
    + ', absolute_dirpath: ' + absolute_dirpath
    + ', dir_filenames: ' + JSON.stringify(dir_filenames));

  for (let i = 0; i < dir_filenames.length; i++) {
    const filename = dir_filenames[i];
    const relative_filepath = path.join(relative_dirpath, filename);
    const absolute_filepath = path.join(basepath, relative_filepath);
    const stat = await lstat(absolute_filepath);
    console.log('filename: ' + filename + ', relative_filepath: ' + relative_filepath
      + ', absolute_filepath: ' + absolute_filepath + ', stat.isDirectory(): ' + stat.isDirectory());

    if (stat.isDirectory()) {
      await scandir(basepath, relative_filepath, file_info_array);
    } else if (stat.isFile()) {
      const file_info = await scanfile(basepath, relative_filepath);
      console.log('file_info: ' + JSON.stringify(file_info, null, 2));
      file_info_array.push(file_info);
    }
  }
}

/**
 * @param {!string} basepath
 * @param {!string} relative_filepath
 */
async function scanfile(basepath, relative_filepath) {
  const absolute_filepath = path.join(basepath, relative_filepath);
  const stat = await lstat(absolute_filepath);
  // TODO calculate hash
  return {
    'path': pathToUnix(relative_filepath),
    'mtime': stat.mtime,
    'size': stat.size
  };
}

/**
 * @param {!string} path
 */
function pathToUnix(path) {
  return path.replace(/\\/g, '/');
}

main().catch(error => {
  console.log('caught error:');
  console.log(error);
});
