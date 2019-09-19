import React, { ReactNode } from 'react';
import { GetTreesResponse, FileInfo, Operation } from './PismoTypes';
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
    viewStyle: 'all'|'onlyDiff';
    pathToMergeOperations: Map<string, Array<Operation>>;
  };

  constructor(props: Props) {
    super(props);

    this.state = {
      expandedPaths: new Set(),
      viewStyle: 'onlyDiff',
      pathToMergeOperations: new Map()
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


    // things that can happen:
    // 1. one or both get deleted
    // 2. one (or both???) is touched
    // 3. one is copied to the other side
    type MergeState = 'Copying from other side'/*|'touchingFromOtherSide'*/|'DELETING'|null;
    let leftMergeState: MergeState = null;
    let rightMergeState: MergeState = null;
    const mergeOperations = this.state.pathToMergeOperations.get(file.path);
    if (mergeOperations && mergeOperations.length > 0) {
      const firstOperation = mergeOperations[0];
      if (firstOperation.operator === 'cp') {
        // binary operation
        if (mergeOperations.length > 1) {
          console.error('multiple merge operations on binary operation! ignoring: ' + JSON.stringify(mergeOperations.slice(1), null, 2));
        }

        if (firstOperation.operands[0].tree === 'base') {
          // copying left to right
          rightMergeState = 'Copying from other side';
        } else {
          // copying right to left
          leftMergeState = 'Copying from other side';
        }

      } else {
        // unary operation(s)
        for (const operation of mergeOperations) {
          if (operation.operator === 'rm') {
            if (operation.operands[0].tree === 'base')
              leftMergeState = 'DELETING';
            else
              rightMergeState = 'DELETING';
          } else if (operation.operator === 'touch') {
            // TODO wait how does touch actually work???
            //   i should actually change the structure to imply unary vs binary operators better.
          }
        }
      }
    }
    const thisMergeState = side === 'left' ? leftMergeState : rightMergeState;
    const convertedSide: 'base'|'other' = side === 'left' ? 'base' : 'other';
    const undo = () => {
      if (!mergeOperations)
        return;
      const undoneMergeOperations = mergeOperations.flatMap(operation => {
        if (operation.operator === 'cp')
          return [];
        if (operation.operands[0].tree === convertedSide)
          return [];
        return [operation];
      });
      const pathToMergeOperations = this.state.pathToMergeOperations;
      pathToMergeOperations.set(file.path, undoneMergeOperations);
      this.setState({
        pathToMergeOperations
      });
    };

    const copy = () => {
      const newMergeOperations: Array<Operation> = [];
      newMergeOperations.push({
        operator: 'cp',
        operands: [{
          tree: convertedSide,
          relativePath: path
        }, {
          tree: convertedSide === 'base' ? 'other' : 'base',
          relativePath: path
        }]
      });
      const pathToMergeOperations = this.state.pathToMergeOperations;
      pathToMergeOperations.set(file.path, newMergeOperations);
      this.setState({
        pathToMergeOperations
      });
    };

    const delet = () => {
      let newMergeOperations: Array<Operation> = [];
      if (mergeOperations)
        newMergeOperations = mergeOperations;
      newMergeOperations.push({
        operator: 'rm',
        operands: [{
          tree: convertedSide,
          relativePath: path
        }]
      })
      const pathToMergeOperations = this.state.pathToMergeOperations;
      pathToMergeOperations.set(file.path, newMergeOperations);
      this.setState({
        pathToMergeOperations
      });
    };

    // TODO find a better way to display this than with a tooltip?
    const tooltip = `mtime: ${mtimeS}.${mtimeNs}, size: ${size}, hash: ${hash}`;

    if (!expanded) {
      if (thisMergeState) {
        return (
          <div className="datagrid-cell clip-overflow monospace" title={tooltip}>
            <button onClick={() => undo()}>undo</button>
            <span style={{fontWeight: 'bold'}}>
              {thisMergeState}
            </span>
            {path}
          </div>
        );
      }

      return (
        <div className="datagrid-cell clip-overflow monospace" title={tooltip}>
          <button onClick={() => copy()} title="copy to other side">copy</button>
          <button onClick={() => delet()} title="delete from this side">delete</button>
          {path}
        </div>
      );
    }

    // TODO show milliseconds in a way that makes sense
    const detailFields: Map<string, string> = new Map();
    detailFields.set('path', path);
    detailFields.set('modified time', new Date(mtimeS * 1000).toISOString());
    detailFields.set('size', filesize(size));
    detailFields.set('hash', hash);
    if (file.customAttributeNameToValue) {
      for (const [name, value] of Object.entries(file.customAttributeNameToValue)) {
        detailFields.set(name, value);
      }
    }

    return (
      <div className="datagrid-cell monospace">
        <button title="copy to other side">copy</button>
        <button title="delete from this side">delete</button>
        <table className="table-borders">
          <tbody>
            {Array.from(detailFields).map(([key, value]) => {
              return (
                <tr>
                  <td>{key}</td>
                  <td>{value}</td>
                </tr>
              );
            })}
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

  renderViewPicker() {
    return (
      <span style={{border: '1px solid black'}}>
        view:
        <label>
          <input
            type="radio"
            name="view-all"
            checked={this.state.viewStyle === 'all'}
            onChange={event => {
              if (!event.target.checked)
                return;
              this.setState({
                viewStyle: 'all'
              });
            }} />
            all
        </label>
        <label>
          <input
            type="radio"
            name="view-all"
            checked={this.state.viewStyle === 'onlyDiff'}
            onChange={event => {
              if (!event.target.checked)
                return;
              this.setState({
                viewStyle: 'onlyDiff'
              });
            }} />
            only diff
        </label>
      </span>
    );
  }

  renderBanner() {
    return (
      <div className="sticky">
        <div>
          <button className="comparer-left-button">save</button>
          {this.renderViewPicker()}
        </div>
        <div className="split-container">
          <div className="split-child comparer-branch-title">
            TODO left name
          </div>
          <div className="split-child comparer-branch-title">
            TODO right name
          </div>
        </div>
      </div>
    );
  }

  renderRow(row: {left?: FileInfo, right?: FileInfo}) {
    if (row.left && row.right && this.state.viewStyle === 'onlyDiff')
      return [];
    
    let path: string = '';
    if (row.left)
      path = row.left.path;
    else if (row.right)
      path = row.right.path;
    if (!path) {
      console.error('this should never happen. row: ', row);
      return [];
    }

    const expanded = this.state.expandedPaths.has(path);

    let diffState: 'same'|'diffmtime'|'diffhash'|'onlyone' = 'onlyone';
    if (row.left && row.right) {
      if (row.left.hash === row.right.hash) {
        if (row.left.mtimeS === row.right.mtimeS && row.left.mtimeNs === row.right.mtimeNs) {
          diffState = 'same';
        } else {
          diffState = 'diffmtime';
        }
      } else {
        diffState = 'diffhash';
      }
    }


    const renderDetail = () => {
      return [
        <div className="datagrid-cell">
          one
        </div>,
        <div className="datagrid-cell">
          two
        </div>
      ];
    };

    return [
      <div className="datagrid-row comparer-border-bottom-soft" key={path}>
        <button
            className="datagrid-cell datagrid-cell-no-grow comparer-left-button"
            onClick={() => { console.log('TODO delet this'); }} >
          delete
        </button>
        <button className="comparer-pick-button">
          pick
        </button>
        <div className="datagrid-cell monospace">
          {path}
        </div>
        <button className="comparer-pick-button comparer-pick-right">
          pick
        </button>
      </div>,
      <div className="datagrid-row comparer-bottom-row">
        {renderDetail()}
      </div>
    ];
  }

  render() {
    return (
      <div className="comparer">
        {this.renderBanner()}

        <div className="datagrid">
          {this.rows.flatMap((row, index)=> {
            /*if (row.left && row.right && this.state.viewStyle === 'onlyDiff')
              return [];

            let path: string = '';
            if (row.left)
              path = row.left.path;
            else if (row.right)
              path = row.right.path;
            if (!path) // TODO signal error? or type check this check away?
              return [];


            const expanded = this.state.expandedPaths.has(path);

            return (
              <div className="datagrid-row" key={path}>
                <div className="datagrid-cell datagrid-cell-no-grow">
                  <button onClick={() => this.toggleExpanded(path)}>expand</button>
                </div>
                {this.fileToCell(row.left, index, 'left', expanded)}
                {this.fileToCell(row.right, index, 'right', expanded)}
              </div>
            );*/
            return this.renderRow(row);
          })}
        </div>
      </div>
    );
  }
}

export default TreeFilesComparer;

// TODO make singular delete button turn into an undo button when you do something with the row