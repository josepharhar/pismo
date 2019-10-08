import { TreeFile, Operation, FileInfo } from "./PismoTypes";
import Differator from "./Differator";

type Next = Array<{treeFile: TreeFile, fileInfo: FileInfo}>;

export function mirrorBaseToOther(baseTree: TreeFile, otherTree: TreeFile): Array<Operation> {
  const output: Array<Operation> = [];

  const differator = new Differator(baseTree, otherTree);
  while (differator.hasNext()) {
    // TODO redesign this to not have to type cast
    const [{treeFile, fileInfo}, second] = differator.next() as Next;
    console.log('poop you joseph');

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
    const [{treeFile, fileInfo}, second] = differator.next() as Next;

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
    const [{treeFile, fileInfo}, second] = differator.next() as Next;

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

export function deduplicate(baseTree: TreeFile, otherTree: TreeFile): Array<Operation> {
  const output: Array<Operation> = [];

  const hashToFiles: Map<string, {left: Array<FileInfo>, right: Array<FileInfo>}> = new Map();
  const getFileForHash = (hash: string) => {
    if (!hashToFiles.has(hash))
      hashToFiles.set(hash, {left: [], right: []});
    return hashToFiles.get(hash)
  }
  for (const file of baseTree.files)
    getFileForHash(file.hash).left.push(file);
  for (const file of otherTree.files)
    getFileForHash(file.hash).right.push(file);

  hashToFiles.forEach((files, hash) => {
    const desiredPath = files.left.length
      ? files.left[0].path
      : files.right[0].path;

    const doSide = (side: 'left'|'right') => {
      const tree: 'base'|'other' = side === 'left' ? 'base' : 'other';
      if (files[side].find(file => file.path === desiredPath)) {
        // delete everything but the desired one
        for (const file of files[side]) {
          if (file.path === desiredPath)
            continue;
          output.push({
            operator: 'rm',
            operands: [{
              tree,
              relativePath: file.path
            }]
          })
        }

      } else {
        // move the first left to the desired spot, delete the rest
        output.push({
          operator: 'mv',
          operands: [{
            tree,
            relativePath: files[side][0].path
          }, {
            tree,
            relativePath: desiredPath
          }]
        })
        for (let i = 1; i < files[side].length; i++) {
          output.push({
            operator: 'rm',
            operands: [{
              tree,
              relativePath: files[side][i].path
            }]
          });
        }
      }
    };

    doSide('left');
    doSide('right');
  });

  return output;
}