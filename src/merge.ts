import * as fs from 'fs';

import {mirrorBaseToOther, twoWayMerge, oneWayAdd} from '../web/src/AutoMerger';

import * as remotes from './remote.js';
import * as pismoutil from './pismoutil.js';
import * as branches from './branch.js';
const {logInfo, logError} = pismoutil.getLogger(__filename);

const Branch = branches.Branch;

type TreeFile = pismoutil.TreeFile;
type FileInfo = pismoutil.FileInfo;
type MergeFile = pismoutil.MergeFile;

/**
 * "Updates" otherTree with new information from baseTree by adding/overwriting
 * all files present in baseTree to otherTree.
 */
export function oneWayUpdate(baseTree: TreeFile, otherTree: TreeFile): Array<FileInfo> {
  const files: Array<FileInfo> = [];

  const oldTreeFilesMap: Map<string, FileInfo> = new Map();
  for (const file of otherTree.files) {
    oldTreeFilesMap.set(file.path, file);
  }

  for (const file of baseTree.files) {
    if (oldTreeFilesMap.has(file.path))
      oldTreeFilesMap.delete(file.path);
    files.push(file);
  }
  for (const file of oldTreeFilesMap.values()) {
    files.push(file);
  }

  files.sort(pismoutil.fileInfoComparator);
  return files;
}

export async function merge(argv: import('./pismo.js').MergeGenArgs) {
  const outputFilepath = argv['output-filepath'];
  const mode = argv['mode'];

  let baseTree: TreeFile|null = null;
  let otherTree: TreeFile|null = null;
  const baseBranch = new Branch(argv.base);
  const otherBranch = new Branch(argv.other);
  if (baseBranch.remote()) {
    const remote = await remotes.getOrCreateRemote(baseBranch.remote());
    baseTree = await remote.readTreeByName(baseBranch.name());
  } else {
    baseTree = await pismoutil.readTreeByName(baseBranch.name());
  }
  if (otherBranch.remote()) {
    const remote = await remotes.getOrCreateRemote(otherBranch.remote());
    otherTree = await remote.readTreeByName(otherBranch.name());
  } else {
    otherTree = await pismoutil.readTreeByName(otherBranch.name());
  }

  // merge format will be a list of operations
  // each operation has:
  //   operator: rm, cp
  //   operands: one or two files, with specificity to base or other tree.
  //             [{tree: 'C:\cygwin64\home\jarhar', file: FileInfo}]
  // TODO use file tree name or path as identifier here??
  // TODO use path as unique identifier everywhere instead of nickname,
  //      reimplement nicknames as an optional feature

  let operations = null;
  switch (argv['mode']) {
    case 'one-way-mirror':
      operations = mirrorBaseToOther(baseTree, otherTree);
      break;

    case 'two-way-sync':
      operations = twoWayMerge(baseTree, otherTree);
      break;

    case 'one-way-add':
      operations = oneWayAdd(baseTree, otherTree);
      break;

    default:
      throw new Error(`Unrecognized merge mode: ${argv['mode']}`);
  }

  const output: MergeFile = {
    baseBranch: baseBranch.rawString(),
    otherBranch: otherBranch.rawString(),
    operations: operations
  };

  const writeFileError = await new Promise(resolve => {
    fs.writeFile(outputFilepath, JSON.stringify(output, null, 2), resolve);
  });
  if (writeFileError) {
    logError(`Failed to write merge file to filepath: ${outputFilepath}`);
    throw writeFileError;
  }
}
