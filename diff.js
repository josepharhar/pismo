const fs = require('fs');
const child_process = require('child_process');
const util = require('util');
const path = require('path');

// TODO replace this with utils.
const readFile = util.promisify(fs.readFile);
const lstat = util.promisify(fs.lstat);
const writeFile = util.promisify(fs.writeFile);
const exec = util.promisify(child_process.exec);
const open = util.promisify(fs.open);

/**
 * @param {!string} aPath
 * @param {!string} bPath
 * @param {boolean=} interactive_mode
 */
exports.diff = async function(aPath, bPath, interactive_mode) {
  const commands_out_path = 'output.sh';
  let commands_out_fd = null;
  if (interactive_mode) {
    commands_out_fd = await open(commands_out_path, 'w');
  }
  async function writeCommand(command) {
    await new Promise((resolve, reject) => {
      fs.write(commands_out_fd, err => {
        if (err)
          reject(err);
        resolve();
      })
    });
  }
  async function flushCommands() {
    await new Promise((resolve, reject) => {
      fs.close(commands_out_fd, err => {
        if (err)
          reject(err);
        resolve();
      });
    });
  }

  aPath = path.resolve(aPath);
  bPath = path.resolve(bPath);

  const a = await readToJson(aPath);
  const b = await readToJson(bPath);

  console.log('a.basepath: ' + a.basepath);
  console.log('b.basepath: ' + b.basepath);

  const afiles = a.file_info_array;
  const bfiles = b.file_info_array;

  let aindex = 0;
  let bindex = 0;
  while (aindex < afiles.length && bindex < bfiles.length) {
    const afileinfo = afiles[aindex];
    const bfileinfo = bfiles[bindex];

    async function copyFileHuh(absolute_src_path, absolute_dest_path) {
      if (!interactive_mode)
        return;
      console.log(absolute_src_path + ' >>> ' + absolute_dest_path);
      let answer = null;
      while (answer != 'c' && answer != 'd' && answer != 'i') {
        answer = await readline.question('(c)opy, (d)elete, or (i)gnore? ');
      }
      switch (answer) {
        case 'c':
          const dest_dir = path.dirname(absolute_dest_path);
          await writeCommand(`mkdir -p "${dest_dir}"`);
          await writeCommand(`cp "${absolute_src_path}" "${absolute_dest_path}"`);
          break;
        case 'd':
          await writeCommand(`rm "${absolute_src_path}"`);
          break;
        case 'i':
          break;
      }
    }

    if (afileinfo.path < bfileinfo.path) {
      // b does not have file in a
      console.log('- a' + afileinfo.path);
      if (interactive_mode)
        await copyFileHuh(a.basepath + afileinfo.path, b.basepath + bfileinfo.path);
      aindex++;

    } else if (afileinfo.path > bfileinfo.path) {
      console.log('+ b' + bfileinfo.path);
      if (interactive_mode)
        await copyFileHuh(b.basepath + bfileinfo.path, a.basepath + afileinfo.path);
      bindex++;

    } else {
      if (JSON.stringify(afileinfo) !== JSON.stringify(bfileinfo)) {
        console.log('- ' + JSON.stringify(bfileinfo, null, 3));
        console.log('+ ' + JSON.stringify(afileinfo, null, 3));
      }

      aindex++;
      bindex++;
    }
  }

  console.log('\nduplicate hashes:');

  const hashToInfo = {};
  for (aindex = 0; aindex < afiles.length; aindex++) {
    const fileinfo = afiles[aindex];
    if (!hashToInfo[fileinfo.hash])
      hashToInfo[fileinfo.hash] = {a: [], b: []};
    hashToInfo[fileinfo.hash].a.push(fileinfo);
  }
  for (bindex = 0; bindex < bfiles.length; bindex++) {
    const fileinfo = bfiles[bindex];
    if (!hashToInfo[fileinfo.hash])
      hashToInfo[fileinfo.hash] = {a: [], b: []};
    hashToInfo[fileinfo.hash].b.push(fileinfo);
  }

  for (const hash in hashToInfo) {
    const infos = hashToInfo[hash];
    if (infos.a.length + infos.b.length < 2)
      continue;
    if (JSON.stringify(infos.a) == JSON.stringify(infos.b))
      continue;
    console.log(hash + ': ' + JSON.stringify(hashToInfo[hash], null, 3));
  }

  if (interactive_mode)
    await flushCommands();
}

async function readToJson(absolute_filepath) {
  let data = null;
  try {
    data = await readFile(absolute_filepath);
  } catch (e) {
    console.log('failed to read file at path: ' + absolute_filepath);
    throw e;
  }

  try {
    return JSON.parse(data);
  } catch (e) {
    console.log('failed to parse file to json: ' + absolute_filepath);
    throw e;
  }
}

/*async function copyFile(src_path, dest_path) {
  const command = `cp "${a.basepath}${afileinfo.path}" "${b.basepath}${bfileinfo.path}"`;
  let answer = null;
  while (answer != 'y' && answer != 'n') {
    answer = await readline.question(command + ' (y/n) ');
  }
  if (answer == 'y') {
    console.log(command);
    try {
      const {stdout, stderr} = await exec(command);
    } catch (e) {
      console.log('  exec error: ' + e);
    }
    if (stdout)
      console.log('  stdout: ' + stdout);
    if (stderr)
      console.log('  stderr: ' + stderr);
  }
}*/
