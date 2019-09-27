import * as path from 'path';
import * as fs from 'fs';

import * as filesize from 'filesize';

import {Branch} from './branch.js';
import * as pismoutil from './pismoutil.js';
const {logInfo, logError} = pismoutil.getLogger(__filename);

/** @typedef {pismoutil.TreeFile} TreeFile */
/** @typedef {pismoutil.FileInfo} FileInfo */
/** @typedef {'filesize'|'name'} OrderArg */

/**
 * @param {import('./pismo.js').DiffArgs} argv
 */
export async function diff(argv) {
  const baseBranch = new Branch(argv.base);
  const otherBranch = argv.other ? new Branch(argv.other) : null;

  const order = /** @type {!OrderArg} */ (argv.order);
  const printAll = /** @type {boolean} */ (argv.printall);
  if (order !== 'filesize' && order !== 'name') {
    throw new Error('invalid "order" arg: ' + order);
  }

  const baseTree = await baseBranch.readTreeByName();
  const otherTree = otherBranch ? await otherBranch.readTreeByName() : null;

  if (otherTree) {
    pismoutil.logColor(pismoutil.Colors.bright,
      `pismo diff ${baseBranch.rawString()} ${otherBranch.rawString()}`
        + `\n + ${baseTree.path}`
        + `\n - ${otherTree.path}`);
    diffTrees(baseTree, otherTree);
  }

  if (argv.printdupes)
    findDuplicates(baseTree, otherTree, order, printAll);
}

/**
 * @param {import('./pismo.js').DupesArgs} argv
 */
export async function dupes(argv) {
  const baseBranch = new Branch(argv.base);
  const otherBranch = argv.other ? new Branch(argv.other) : null;

  const order = /** @type {!OrderArg} */ (argv.order);
  const printAll = /** @type {boolean} */ (argv.printall);
  if (order !== 'filesize' && order !== 'name') {
    throw new Error('invalid "order" arg: ' + order);
  }

  const baseTree = await baseBranch.readTreeByName();
  const otherTree = otherBranch ? await otherBranch.readTreeByName() : null;

  findDuplicates(baseTree, otherTree, order, printAll);
}

/**
 * @param {!TreeFile} baseTree
 * @param {!TreeFile} otherTree
 */
export async function diffTrees(baseTree, otherTree) {
  const differator = new Differator(baseTree, otherTree);
  while (differator.hasNext()) {
    const [{treeFile, fileInfo}, second] = differator.next();
    const readableFileInfo = pismoutil.humanReadableFileInfo(fileInfo);

    if (second) {
      const secondReadableFileInfo = pismoutil.humanReadableFileInfo(second.fileInfo);
      pismoutil.logColor(pismoutil.Colors.yellow, '~ ' + fileInfo.path);
      for (const prop in readableFileInfo) {
        if (fileInfo[prop] !== second.fileInfo[prop]) {
          pismoutil.logColor(pismoutil.Colors.yellow,
            `  + ${prop}: ${readableFileInfo[prop]}`);
          pismoutil.logColor(pismoutil.Colors.yellow,
            `  + ${prop}: ${secondReadableFileInfo[prop]}`);
        }
      }
    } else if (treeFile === baseTree) {
      pismoutil.logColor(pismoutil.Colors.green,
        `+ ${fileInfo.path}`);

    } else if (treeFile === otherTree) {
      pismoutil.logColor(pismoutil.Colors.red,
        `- ${fileInfo.path}`);

    } else {
      throw new Error('this should never happen.');
    }
  }
}

/**
 * @param {!TreeFile} baseTree
 * @param {?TreeFile} otherTree
 * @param {!OrderArg} order
 * @param {boolean} printAll
 */
function findDuplicates(baseTree, otherTree, order, printAll) {
  /** @type {!Map<string, {'base': !Array<FileInfo>, 'other': !Array<FileInfo>}>} */
  const hashToFiles = new Map();

  for (const file of baseTree.files) {
    if (!hashToFiles.has(file.hash))
      hashToFiles.set(file.hash, {'base': [], 'other': []});
    hashToFiles.get(file.hash).base.push(file);
  }

  if (otherTree) {
    for (const file of otherTree.files) {
      if (!hashToFiles.has(file.hash))
        hashToFiles.set(file.hash, {'base': [], 'other': []});
      hashToFiles.get(file.hash).other.push(file);
    }
  }

  let entries = Array.from(hashToFiles.entries());
  if (order === 'filesize') {
    entries = entries.sort(([oneHash, oneObj], [twoHash, twoObj]) => {
      const oneSize = oneObj.base.length
        ? oneObj.base[0].size
        : oneObj.other[0].size;
      const twoSize = twoObj.base.length
        ? twoObj.base[0].size
        : twoObj.other[0].size;

      if (oneSize < twoSize)
        return -1;
      if (oneSize > twoSize)
        return 1;
      return 0;
    });
  }

  let printedDupe = false;
  let totalSize = 0;
  for (const [hash, {base, other}] of entries) {
    if (!printAll && base.length + other.length < 2)
      continue;
    if (!printedDupe)
      console.log('Duplicates:');
    printedDupe = true;

    const size = base.length ? base[0].size : other[0].size;
    console.log(`  hash: ${hash}, size: ${filesize(size)}`);
    for (const file of base) {
      totalSize += size;
      pismoutil.logColor(pismoutil.Colors.yellow, `    ${path.join(baseTree.path, file.path)}`);
    }
    for (const file of other) {
      totalSize += size;
      pismoutil.logColor(pismoutil.Colors.yellow, `    ${path.join(otherTree.path, file.path)}`);
    }
    totalSize -= size;
  }

  if (printedDupe) {
  console.log('Total size that could be saved by deleting duplicates: ' + filesize(totalSize));
  } else {
    if (otherTree)
      console.log(`No duplicates found within or between "${baseTree.path}" and "${otherTree.path}"`)
    else
      console.log(`No duplicates found within "${baseTree.path}"`);
  }
}

export class Differator {
  /**
   * @param {!TreeFile} baseTree
   * @param {!TreeFile} otherTree
   */
  constructor(baseTree, otherTree) {
    this._baseTree = baseTree;
    this._otherTree = otherTree;
    this._baseIndex = 0;
    this._otherIndex = 0;
  }

  _getNextFile(treeFile, index) {
    return index < treeFile.files.length
        ? treeFile.files[index]
        : null;
  }

  _getNextBaseFile() {
    return this._getNextFile(this._baseTree, this._baseIndex);
  }

  _getNextOtherFile() {
    return this._getNextFile(this._otherTree, this._otherIndex);
  }

  _areHeadsDifferent() {
    const baseFile = this._getNextBaseFile();
    const otherFile = this._getNextOtherFile();
    if (!baseFile || !otherFile)
      return true; // TODO not always true if both are null?
    return JSON.stringify(baseFile) !== JSON.stringify(otherFile);
  }

  _goToNextDiff() {
    while (!this._areHeadsDifferent()) {
      this._baseIndex++;
      this._otherIndex++;
    }
  }

  hasNext() {
    this._goToNextDiff();
    return this._baseIndex < this._baseTree.files.length
      || this._otherIndex < this._otherTree.files.length;
  }

  /**
   * @return {!Array<{treeFile: TreeFile, fileInfo: FileInfo}>}
   */
  next() {
    if (!this.hasNext())
      return null;
    // calling hasNext() triggers _goToNextDiff(), so heads are ready
    const baseFile = this._getNextBaseFile();
    const otherFile = this._getNextOtherFile();

    if (!otherFile || (baseFile && baseFile.path < otherFile.path)) {
      this._baseIndex++;
      return [{
        treeFile: this._baseTree,
        fileInfo: baseFile
      }];
    } else if (!baseFile || otherFile.path < baseFile.path) {
      this._otherIndex++;
      return [{
        treeFile: this._otherTree,
        fileInfo: otherFile
      }];
    } else {
      this._baseIndex++;
      this._otherIndex++;
      return [{
        treeFile: this._baseTree,
        fileInfo: baseFile
      }, {
        treeFile: this._otherTree,
        fileInfo: otherFile
      }];
    }
  }
};