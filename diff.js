const fs = require('fs');
const path = require('path');
const util = require('util');
const crypto = require('crypto');

const readFile = util.promisify(fs.readFile);
const lstat = util.promisify(fs.lstat);
const writeFile = util.promisify(fs.writeFile);

async function main() {
  function printUsageAndExit() {
    console.log('usage: node diff.js <a.js> <b.js>');
  }

  if (process.argv.length != 4) {
    printUsageAndExit();
  }

  const apath = path.resolve(process.argv[2]);
  const bpath = path.resolve(process.argv[3]);

  const a = await readToJson(apath);
  const b = await readToJson(bpath);

  console.log('a.basepath: ' + a.basepath);
  console.log('b.basepath: ' + b.basepath);

  const afiles = a.file_info_array;
  const bfiles = b.file_info_array;

  let aindex = 0;
  let bindex = 0;
  while (aindex < afiles.length && bindex < bfiles.length) {
    const afileinfo = afiles[aindex];
    const bfileinfo = bfiles[bindex];

    if (afileinfo.path < bfileinfo.path) {
      console.log('- ' + bfileinfo.path);
      aindex++;

    } else if (afileinfo.path > bfileinfo.path) {
      console.log('+ ' + afileinfo.path);
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

main().catch(error => {
  console.log('caught error:');
  console.log(error);
});
