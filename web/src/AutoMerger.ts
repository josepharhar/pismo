import { MergeFile, TreeFile, Operation } from "./PismoTypes";
import Differator from "./Differator";

// TODO replace functions in merge.js with this

export function mirrorBaseToOther(baseTree: TreeFile, otherTree: TreeFile): Array<Operation> {
  const output: Array<Operation> = [];

  const differator = new Differator(baseTree, otherTree);
  while (differator.hasNext()) {
    const [{treeFile, fileInfo}, second] = differator.next();

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

export function twoWayMerge(base: TreeFile, other: TreeFile): Array<Operation> {
}