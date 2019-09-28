import { MergeFile, TreeFile, Operation, FileInfo } from "./PismoTypes";
import Differator from "./Differator";

export function mirrorBaseToOther(baseTree: TreeFile, otherTree: TreeFile): Array<Operation> {
  const output: Array<Operation> = [];

  const differator = new Differator(baseTree, otherTree);
  while (differator.hasNext()) {
    // TODO redesign this to not have to type cast
    const [{treeFile, fileInfo}, second] = <Array<{treeFile: TreeFile, fileInfo: FileInfo}>>differator.next();

    if (second) {
      output.push({
        operator: second.fileInfo.hash === fileInfo.hash ? 'touch' : 'cp',
        operands: [{tree: 'base', relativePath: fileInfo.path},
                   {tree: 'other', relativePath: second.fileInfo.path}]
      });

    } else if (treeFile === baseTree) {
      output.push({
        operator: 'cp',
        operands: [{tree: 'base', relativePath: fileInfo.path},
                   {tree: 'other', relativePath: fileInfo.path}]
      });

    } else if (treeFile === otherTree) {
      output.push({
        operator: 'rm',
        operands: [{tree: 'other', relativePath: fileInfo.path}]
      });

    } else {
      throw new Error('this should never happen');
    }
  }

  return output;
}

export function twoWayMerge(baseTree: TreeFile, otherTree: TreeFile): Array<Operation> {
  const output: Array<Operation> = [];

  const differator = new Differator(baseTree, otherTree);
  while (differator.hasNext()) {
    const [{treeFile, fileInfo}, second] = <Array<{treeFile: TreeFile, fileInfo: FileInfo}>>differator.next();

    if (second) {
      // TODO how can this be properly represented in a merge file?
      output.push({
        operator: second.fileInfo.hash === fileInfo.hash ? 'touch' : 'cp',
        operands: [{tree: 'base', relativePath: fileInfo.path},
                   {tree: 'other', relativePath: second.fileInfo.path}]
      });

    } else if (treeFile === baseTree) {
      output.push({
        operator: 'cp',
        operands: [{tree: 'base', relativePath: fileInfo.path},
                   {tree: 'other', relativePath: fileInfo.path}]
      });

    } else if (treeFile === otherTree) {
      output.push({
        operator: 'cp',
        // TODO should this be this way? i should write a test for this or something
        operands: [{tree: 'other', relativePath: fileInfo.path},
                   {tree: 'base', relativePath: fileInfo.path}]
      });

    } else {
      throw new Error('this should never happen');
    }
  }

  return output;
}

export function oneWayAdd(baseTree: TreeFile, otherTree: TreeFile): Array<Operation> {
  const output: Array<Operation> = [];

  const differator = new Differator(baseTree, otherTree);
  while (differator.hasNext()) {
    const [{treeFile, fileInfo}, second] = <Array<{treeFile: TreeFile, fileInfo: FileInfo}>>differator.next();

    if (second) {
      console.log('warning: file found on both sides: "' + fileInfo.path + '", using base');
      output.push({
        operator: second.fileInfo.hash === fileInfo.hash ? 'touch' : 'cp',
        operands: [{tree: 'base', relativePath: fileInfo.path},
                   {tree: 'other', relativePath: second.fileInfo.path}]
      });
    } else if (treeFile === baseTree) {
      output.push({
        operator: 'cp',
        operands: [{tree: 'base', relativePath: fileInfo.path},
                   {tree: 'other', relativePath: fileInfo.path}]
      });
    } else if (treeFile === otherTree) {
      // do nothing, thats the point of this style of merge.
    } else {
      throw new Error('this should never happen');
    }
  }

  return output;
}
