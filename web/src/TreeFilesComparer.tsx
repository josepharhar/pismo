import React, { ReactNode } from 'react';
import DataGrid from './DataGrid';
import { GetTreesResponse, FileInfo } from './PismoTypes';

interface Props {
  getTreesResponse: GetTreesResponse;
  leftBranchName: string;
  rightBranchName: string;
}

class TreeFilesComparer extends React.Component<Props> {
  datagrid: ReactNode;

  constructor(props: Props) {
    super(props);

    const {getTreesResponse, leftBranchName, rightBranchName} = props;

    const leftTreeWithName = getTreesResponse.trees.find(tree => tree.treename === leftBranchName);
    const rightTreeWithName = getTreesResponse.trees.find(tree => tree.treename === rightBranchName);
    if (!leftTreeWithName)
      throw new Error('cant find tree with name: ' + leftBranchName);
    if (!rightTreeWithName)
      throw new Error('cant find tree with name: ' + rightBranchName);
    const treeFileOne = leftTreeWithName.treefile;
    const treeFileTwo = rightTreeWithName.treefile;

    /** @type {!Array<{left: ?FileInfo, right: ?FileInfo}>} */
    let rows = [];
    const leftFiles = treeFileOne.files;
    const rightFiles = treeFileTwo.files;
    let leftIndex = 0;
    let rightIndex = 0;
    while (leftIndex < leftFiles.length || rightIndex < rightFiles.length) {
      const leftFilename = leftIndex < leftFiles.length ? leftFiles[leftIndex].path : null;
      const rightFilename = rightIndex < rightFiles.length ? rightFiles[rightIndex].path : null;
      if (!leftFilename || (rightFilename && rightFilename < leftFilename)) {
        rows.push({
          right: rightFiles[rightIndex++]
        });
      } else if (!rightFilename || leftFilename < rightFilename) {
        rows.push({
          left: leftFiles[leftIndex++]
        });
      } else {
        rows.push({
          right: rightFiles[rightIndex++],
          left: leftFiles[leftIndex++]
        });
      }
    }
    function fileToCell(file: FileInfo|undefined, key: string): ReactNode {
      if (!file) {
        return (
          <div key={key} className="empty"></div>
        );
      }
      const {path, mtimeS, mtimeNs, size, hash} = file;
      return (
        <div key={path}>
          <span className="monospace" title={`mtime: ${mtimeS}.${mtimeNs}, size: ${size}, hash: ${hash}`}>{path}</span>
          <button title="copy to other side">copy</button>
          <button title="delete from this side">delete</button>
        </div>
      );
    }
    /** @type {!Array<!Array<!ReactNode>>} */
    const rowElements = rows.map((row, index) => {
      return [fileToCell(row.left, `left-${index}`), fileToCell(row.right, `right-${index}`)];
    });
    this.datagrid = <DataGrid rows={rowElements} />;
  }

  render() {
    return this.datagrid;
  }
}

export default TreeFilesComparer;