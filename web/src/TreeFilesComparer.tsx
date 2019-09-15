import React, { ReactNode } from 'react';
import { GetTreesResponse, FileInfo } from './PismoTypes';
import './TreeFilesComparer.css';
import './DataGrid.css';
//import { FixedSizeList } from 'react-window';
import filesize from 'filesize';

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

  state: {
    expandedPaths: Set<string>;
  };

  constructor(props: Props) {
    super(props);

    this.state = {
      expandedPaths: new Set()
    };

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

  fileToCell(file: FileInfo|undefined, index: number, side: 'left'|'right', expanded: boolean): ReactNode {
    const key = `${index}-${side}`;
    if (!file) {
      return <div key={key} className="datagrid-cell empty"><div>file not present</div></div>;
    }
    const {path, mtimeS, mtimeNs, size, hash} = file;

    // TODO find a better way to display this than with a tooltip?
    const tooltip = `mtime: ${mtimeS}.${mtimeNs}, size: ${size}, hash: ${hash}`;

    if (!expanded) {
      return (
        <div className="datagrid-cell clip-overflow monospace" title={tooltip}>
          <button title="copy to other side">copy</button>
          <button title="delete from this side">delete</button>
          {path}
        </div>
      );
    }

    // TODO show milliseconds in a way that makes sense
    return (
      <div className="datagrid-cell monospace">
        <button title="copy to other side">copy</button>
        <button title="delete from this side">delete</button>
        <table className="table-borders">
          <tbody>
            <tr>
              <td>path</td>
              <td>{path}</td>
            </tr>
            <tr>
              <td>modified time</td>
              <td>{new Date(mtimeS * 1000).toISOString()}</td>
            </tr>
            <tr>
              <td>size</td>
              <td>{filesize(size)}</td>
            </tr>
            <tr>
              <td>hash</td>
              <td>{hash}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  toggleExpanded(path: string) {
    const expandedPaths = this.state.expandedPaths;
    if (expandedPaths.has(path)) {
      expandedPaths.delete(path);
    } else {
      expandedPaths.add(path);
    }
    this.setState({
      expandedPaths
    });
  }

  render() {
    return <div className="datagrid">
      {this.rows.map((row, index)=> {
        let path: string = '';
        if (row.left)
          path = row.left.path;
        else if (row.right)
          path = row.right.path;
        if (!path)
          return null;

        const expanded = this.state.expandedPaths.has(path);

        return (
          <div className="datagrid-row">
            <div className="datagrid-cell datagrid-cell-no-grow">
              <button onClick={() => this.toggleExpanded(path)}>expand</button>
            </div>
            {this.fileToCell(row.left, index, 'left', expanded)}
            {this.fileToCell(row.right, index, 'right', expanded)}
          </div>
        );
      })}
    </div>;
  }
}

export default TreeFilesComparer;