import React, { ReactNode } from 'react';
import DataGrid from './DataGrid';
import { GetTreesResponse, FileInfo } from './PismoTypes';
import './TreeFilesComparer.css';

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
    function fileToCell(file: FileInfo|undefined, key: string, side: 'left'|'right'): ReactNode {
      if (!file) {
        return (
          <div key={key} className="empty"></div>
        );
      }
      const {path, mtimeS, mtimeNs, size, hash} = file;
      const text = <span
          className="monospace clip-overflow"
          title={`mtime: ${mtimeS}.${mtimeNs}, size: ${size}, hash: ${hash}`}>
        {path}
      </span>;
      const buttons = <span>
        <button title="copy to other side">copy</button>
        <button title="delete from this side">delete</button>
      </span>;
      return (
        <div key={path}>
          <span className="left">{/*side === 'left' ? text : buttons*/buttons}</span>
          <span className="right">{/*side === 'left' ? buttons : text*/text}</span>
        </div>
      );
    }
    const rowElements: Array<Array<ReactNode>> = rows.map((row, index) => {
      return [fileToCell(row.left, `left-${index}`, 'left'), fileToCell(row.right, `right-${index}`, 'right')];
    });
    const headerElements: Array<Array<ReactNode>> = [[
      <p>{leftTreeWithName.treename}</p>,
      <p>{rightTreeWithName.treename}</p>
    ]];
    this.datagrid = <DataGrid rows={headerElements.concat(rowElements)} />;
  }

  render() {
    return this.datagrid;
  }
}

export default TreeFilesComparer;