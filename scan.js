const fs = require('fs');
const path = require('path');
const util = require('util');
const crypto = require('crypto');

const md5file = require('md5-file/promise');

const readFile = util.promisify(fs.readFile);
const readdir = util.promisify(fs.readdir);
const lstat = util.promisify(fs.lstat);
const writeFile = util.promisify(fs.writeFile);

/**
 * Tree structure vs flat structure:
 * flat structure makes it easy to read the file just by looking at it
 * tree structure makes it easy to track directories
 *
 * lets just start with flat structure and see how it ends up
 */

async function main() {
  function printUsageAndExit() {
    console.log('usage: node scan.js </path/to/scandir> <output.json>');
    console.log('   if output.json already exists, it will be used as a cache');
    process.exit(1);
  }

  if (process.argv.length != 4) {
    printUsageAndExit();
  }

  const basepath = path.resolve(process.argv[2]);
  const outpath = path.resolve(process.argv[3]);

  // TODO i think this is useless and should be deleted
  if (!path.isAbsolute(basepath)) {
    console.log('Provided path must be absolute. given: ' + basepath);
    process.exit(1);
  }

  let cached_file = null;
  try {
    cached_file = await readFile(outpath);
  } catch (e) {
    // if the file doesnt exist thats ok
    // TODO check to see if the error is something else?
  }
  if (cached_file) {
    // TODO use as a cache for file hashes
  }

  const file_info_array = [];
  await scandir(basepath, '/', file_info_array);

  const output = {
    'basepath': basepath,
    'file_info_array': file_info_array
  };
  await writeFile(outpath, JSON.stringify(output, null, 2));
}

/**
 * @param {!string} basepath Platform specific absolute path
 * @param {!string} relative_dirpath Path relative to basepath
 * @param {!Array<FileInfo>} file_info_array
 */
async function scandir(basepath, relative_dirpath, file_info_array) {
  const absolute_dirpath = path.join(basepath, relative_dirpath);
  const dir_filenames = await readdir(absolute_dirpath);
  dir_filenames.sort();

  for (let i = 0; i < dir_filenames.length; i++) {
    const filename = dir_filenames[i];
    if (filename.startsWith('.'))
      continue; // ignore dotfiles

    const relative_filepath = path.join(relative_dirpath, filename);
    const absolute_filepath = path.join(basepath, relative_filepath);
    const stat = await lstat(absolute_filepath);

    if (stat.isDirectory()) {
      await scandir(basepath, relative_filepath, file_info_array);
    } else if (stat.isFile()) {
      const file_info = await scanfile(basepath, relative_filepath);
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
  let hash = null;
  try {
    hash = await md5file(absolute_filepath);
  } catch (e) {
    console.log('failed to get hash for file: ' + absolute_filepath);
  }
  return {
    path: pathToUnix(relative_filepath),
    mtime: stat.mtime,
    size: stat.size,
    hash: hash
  };
}

/**
 * @param {!string} path
 */
function pathToUnix(path) {
  return path.replace(/\\/g, '/');
}

function fileHash(absolute_filepath) {
  /*return new Promise((resolve, reject) => {
    const output = crypto.createHash('md5');
    const input = fs.createReadStream(absolute_filepath);
    input.on('error', error => reject(error));
    output.once('readable', () => {
      resolve(null, output.read().toString('hex'));
    });
    input.pipe(output);
  });*/
  /*return new Promise((resolve, reject) => {
    md5file(absolute_path, (err, hash) => {
      if (err)
        reject(err)
      resolve(hash);
    });
  });*/
  //return md5file.sync(absolute_filepath);
}

main().catch(error => {
  console.log('caught error:');
  console.log(error);
});
