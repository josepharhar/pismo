import { TreeFile, FileInfo } from "./PismoTypes";

export default class Differator {
  baseTree: TreeFile;
  otherTree: TreeFile;
  baseIndex: number;
  otherIndex: number;

  constructor(baseTree: TreeFile, otherTree: TreeFile) {
    this.baseTree = baseTree;
    this.otherTree = otherTree;
    this.baseIndex = 0;
    this.otherIndex = 0;
  }

  getNextFile(treeFile: TreeFile, index: number) {
    return index < treeFile.files.length
        ? treeFile.files[index]
        : null;
  }

  getNextBaseFile() {
    return this.getNextFile(this.baseTree, this.baseIndex);
  }

  getNextOtherFile() {
    return this.getNextFile(this.otherTree, this.otherIndex);
  }

  areHeadsDifferent() {
    const baseFile = this.getNextBaseFile();
    const otherFile = this.getNextOtherFile();
    if (!baseFile || !otherFile)
      return true; // TODO not always true if both are null?
    return JSON.stringify(baseFile) !== JSON.stringify(otherFile);
  }

  goToNextDiff() {
    while (!this.areHeadsDifferent()) {
      this.baseIndex++;
      this.otherIndex++;
    }
  }

  hasNext() {
    this.goToNextDiff();
    return this.baseIndex < this.baseTree.files.length
      || this.otherIndex < this.otherTree.files.length;
  }

  next(): Array<{treeFile: TreeFile, fileInfo: FileInfo}>|null {
    if (!this.hasNext())
      return null;
    // calling hasNext() triggers goToNextDiff(), so heads are ready
    const baseFile = this.getNextBaseFile();
    const otherFile = this.getNextOtherFile();

    if (!otherFile || (baseFile && baseFile.path < otherFile.path)) {
      this.baseIndex++;
      return [{
        treeFile: this.baseTree,
        fileInfo: <FileInfo>baseFile
      }];
    } else if (!baseFile || otherFile.path < baseFile.path) {
      this.otherIndex++;
      return [{
        treeFile: this.otherTree,
        fileInfo: otherFile
      }];
    } else {
      this.baseIndex++;
      this.otherIndex++;
      return [{
        treeFile: this.baseTree,
        fileInfo: baseFile
      }, {
        treeFile: this.otherTree,
        fileInfo: otherFile
      }];
    }
  }
};