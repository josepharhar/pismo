import * as fs from 'fs';
import * as util from 'util';
import * as path from 'path';

import * as pismoutil from './pismoutil.js';

const unlinkPromise = util.promisify(fs.unlink);
const readdirPromise = util.promisify(fs.readdir);

export async function deleteEmptydirs(argv: import('./pismo.js').DeleteEmptydirsArgs) {
  const {name, dryrun} = argv;

  const treefilepath = (await pismoutil.getTreeNamesToPaths())[name];
  if (!treefilepath)
    throw new Error('Failed to find tree with name: ' + name);

  const treefile = await pismoutil.readFileToJson(treefilepath);
  if (!treefile)
    throw new Error('Failed to read tree json file for name: ' + name);

  const dirpath = treefile.path;
  const emptyDirs = await getEmptyDirs(dirpath, '/');
  for (const emptyDir of emptyDirs) {
    try {
      await unlinkPromise(emptyDir);
    } catch (error) {
      throw new Error('Failed to unlink.'
        + '\n  emptyDir: ' + emptyDir
        + '\n  error:\n' + JSON.stringify(error, null, 2));
    }
  }
}

async function getEmptyDirs(basepath: string, relativePath: string): Promise<Array<string>> {
  const absolutePath = path.join(basepath, relativePath);
  let dirents = null;
  try {
    dirents = await readdirPromise(absolutePath, {withFileTypes: true});
  } catch (error) {
    throw new Error('Failed to readdirPromise.'
      + '\n  basepath: ' + basepath
      + '\n  relativePath: ' + relativePath
      + '\n  absolutePath: ' + absolutePath
      + '\n  error:\n' + error);
  }

  if (!dirents.length)
    return [this];
}
