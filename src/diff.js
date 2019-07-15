const path = require('path');
const fs = require('fs');

const filesize = require('filesize');

const pismoutil = require('./pismoutil.js');
const {logInfo, logError} = pismoutil.getLogger(__filename);

/** @typedef {pismoutil.TreeFile} TreeFile */
/** @typedef {pismoutil.FileInfo} FileInfo */

/**
 * @param {import('./pismo.js').DiffArgs} argv
 */
exports.diff = async function(argv) {
  const baseName = argv.base;
  const otherName = argv.other;

  const baseTree = await pismoutil.readTreeByName(baseName);
  const otherTree = otherName ? await pismoutil.readTreeByName(otherName) : null;

  if (otherTree) {
    pismoutil.logColor(pismoutil.Colors.bright,
      `pismo diff ${baseName} ${otherName}`
        + `\n + ${baseTree.path}`
        + `\n - ${otherTree.path}`);
    exports.diffTrees(baseTree, otherTree);
  }
  exports.findDuplicates(baseTree, otherTree);
}

/**
 * @param {!TreeFile} baseTree
 * @param {!TreeFile} otherTree
 */
exports.diffTrees = async function(baseTree, otherTree) {
  const differator = exports.differator(baseTree, otherTree);
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
 */
exports.findDuplicates = function(baseTree, otherTree) {
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

  const entries = Array.from(hashToFiles.entries())
    .sort(([oneHash, oneObj], [twoHash, twoObj]) => {
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

  let printedDupe = false;
  let totalSize = 0;
  for (const [hash, {base, other}] of entries) {
    if (base.length + other.length < 2)
      continue;
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

class Differator {
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

/**
 * @param {!TreeFile} baseTree
 * @param {!TreeFile} otherTree
 * @return {!Differator}
 */
exports.differator = function(baseTree, otherTree) {
  return new Differator(baseTree, otherTree);
}
