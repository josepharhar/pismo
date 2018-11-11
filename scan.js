const utils = require('./utils.js');

const filesize = require('filesize');

const readFile = util.promisify(fs.readFile);
const readdir = util.promisify(fs.readdir);
const lstat = util.promisify(fs.lstat);
const writeFile = util.promisify(fs.writeFile);
const exec = util.promisify(child_process.exec);

/**
 * @param {!string} outpath
 * @param {string=} input_basepath
 */
exports.scan = async function(outpath, input_basepath) {
  let {cache, basepath} = await readcache(outpath);
  if (!basepath) {
    if (!input_basepath) {
      console.log('Path to scan could not be determined from cache file');
      console.log('  and was not passed as a command line parameter.');
      return;
    }
    basepath = input_basepath;
  } else if (input_basepath) {
    console.log('Using scan path ' + basepath + ' from cache file instead of supplied ' + process.argv[3]);
  }

  const file_info_array = [];
  await scandir(basepath, '/', file_info_array, cache);

  file_info_array.sort((a, b) => {
    if (a.path < b.path)
      return -1;
    if (a.path > b.path)
      return 1;
    return 0;
  });

  const output = {
    'basepath': basepath,
    'file_info_array': file_info_array
  };
  await writeFile(outpath, JSON.stringify(output, null, 2));
}

/**
 * Cache maps from relative filepath to full FileInfo
 * @return {?object<string, FileInfo>}
 */
async function readcache(cache_filepath) {
  let filedata = null;
  try {
    filedata = await readFile(cache_filepath);
  } catch (e) {
    // failed to read cache, probably there is none.
    console.log('no cache file found');
    return {cache: null, basepath: null};
  }

  const cache_tree = JSON.parse(filedata);
  console.log('found cache file with basepath: ' + cache_tree.basepath);
  const cache = {};
  cache_tree.file_info_array.forEach(file_info => {
    console.log('putting path in cache: ' + file_info.path + ' -> ' + file_info.hash);
    cache[file_info.path] = file_info;
  });
  return {cache: cache, basepath: cache_tree.basepath};
}

/**
 * @param {!string} basepath Platform specific absolute path
 * @param {!string} relative_dirpath Path relative to basepath
 * @param {!Array<FileInfo>} file_info_array
 * @param {?object<string, FileInfo>} cache
 */
async function scandir(basepath, relative_dirpath, file_info_array, cache) {
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
      await scandir(basepath, relative_filepath, file_info_array, cache);

    } else if (stat.isFile()) {
      const file_info = await scanfile(basepath, relative_filepath, cache);
      //file_info.name = filename;
      file_info_array.push(file_info);
    }
  }
}

/**
 * @param {!string} basepath
 * @param {!string} relative_filepath
 * @param {?object<string, FileInfo>} cache
 * @return {!FileInfo}
 */
async function scanfile(basepath, relative_filepath, cache) {
  const file_info = {};

  const absolute_filepath = path.join(basepath, relative_filepath);
  file_info.path = utils.pathToUnix(relative_filepath);

  const stat = await lstat(absolute_filepath);
  file_info.mtime = stat.mtime;
  file_info.size = stat.size;
  file_info.size_human = filesize(file_info.size);

  const fields_for_comparing = ['path', 'mtime', 'size'];

  // compute hash, using cache if available
  if (cache) {
    const cache_result = cache[file_info.path];
    if (cache_result) {
      const cache_result_copy = {};
      const file_info_copy = {};
      fields_for_comparing.forEach(field => {
        cache_result_copy[field] = cache_result[field];
        file_info_copy[field] = file_info[field];
      });

      if (JSON.stringify(file_info_copy) == JSON.stringify(cache_result_copy)) {
        // cache hit!
        file_info.hash = cache_result.hash;
        file_info.ffprobe = cache_result.ffprobe;
        console.log('used cache for file: ' + file_info.path);
      }
    }
  }

  if (!file_info.hash) {
    console.log('calculating new hash for file: ' + file_info.path);
    try {
      file_info.hash = await fileHash(absolute_filepath);
    } catch (e) {
      console.log('failed to get hash for file: ' + absolute_filepath);
    }
  }

  if (!file_info.ffprobe) {
    file_info.ffprobe = await ffprobe(absolute_filepath);
  }

  return file_info;
}

function fileHash(absolute_filepath) {
  return new Promise((resolve, reject) => {
    const output = crypto.createHash('md5');
    const input = fs.createReadStream(absolute_filepath);
    input.on('error', err => {
      reject(err);
    });
    output.once('readable', () => {
      resolve(output.read().toString('hex'));
    });
    input.pipe(output);
  });
}

async function ffprobe(absolute_filepath) {
  const command =
    `ffprobe -of json -v error -show_entries stream=width,height,index,codec_name,bit_rate "${absolute_filepath}"`;
  console.log(command);
  try {
    const {stdout, stderr} = await exec(command);
    if (stderr)
      console.log('ffprobe stderr: ' + stderr);
    try {
      return JSON.parse(stdout);
    } catch (e) {
      return 'failed to parse to json: ' + stdout + '\n with error: ' + e;
    }

  } catch (e) {
    return 'exec error: ' + e;
  }
}
