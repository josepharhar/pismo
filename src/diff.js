const path = require('path');
const fs = require('fs');

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
  const otherTree = await pismoutil.readTreeByName(otherName);

  pismoutil.logColor(pismoutil.Colors.bright,
    `pismo diff ${baseName} ${otherName}`
      + `\n + ${baseTree.path}`
      + `\n - ${otherTree.path}`);

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

    /*let useBase = null;
    if (!otherFile)
      useBase = true;
    else if ()*/

    // otherfile = {}
    // basefile = null
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
