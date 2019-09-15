import React, { ReactNode } from 'react';
import { GetTreesResponse, FileInfo } from './PismoTypes';
import './TreeFilesComparer.css';
import './DataGrid.css';

interface Props {
  getTreesResponse: GetTreesResponse;
  leftBranchName: string;
  rightBranchName: string;
}

class TreeFilesComparer extends React.Component<Props> {
  rows: Array<{
    left?: FileInfo;
    right?: FileInfo;
  }>;

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

    this.rows = [];
    const leftFiles = treeFileOne.files;
    const rightFiles = treeFileTwo.files;
    let leftIndex = 0;
    let rightIndex = 0;
    while (leftIndex < leftFiles.length || rightIndex < rightFiles.length) {
      const leftFilename = leftIndex < leftFiles.length ? leftFiles[leftIndex].path : null;
      const rightFilename = rightIndex < rightFiles.length ? rightFiles[rightIndex].path : null;
      if (!leftFilename || (rightFilename && rightFilename < leftFilename)) {
        this.rows.push({
          right: rightFiles[rightIndex++]
        });
      } else if (!rightFilename || leftFilename < rightFilename) {
        this.rows.push({
          left: leftFiles[leftIndex++]
        });
      } else {
        this.rows.push({
          right: rightFiles[rightIndex++],
          left: leftFiles[leftIndex++]
        });
      }
    }
  }

  fileToCell(file: FileInfo|undefined, index: number, side: 'left'|'right'): ReactNode {
    const key = `${index}-${side}`;
    if (!file) {
      return <div key={key} className="datagrid-cell empty">
        TODO delet this text
      </div>;
    }
    const {path, mtimeS, mtimeNs, size, hash} = file;

    const textContent = path;
    // TODO find a better way to display this than with a tooltip?
    const tooltip = `mtime: ${mtimeS}.${mtimeNs}, size: ${size}, hash: ${hash}`;

    return <div className="datagrid-cell" title={tooltip}>
      <button title="copy to other side">copy</button>
      <button title="delete from this side">delete</button>
      {textContent}
    </div>;
  }

  render() {
    return <div className="datagrid">
      {this.rows.map((row, index)=> {
        return <div className="datagrid-row">
          {this.fileToCell(row.left, index, 'left')}
          {this.fileToCell(row.right, index, 'right')}
        </div>;
      })}
    </div>;
  }
}

export default TreeFilesComparer;