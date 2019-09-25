import React, { ReactNode } from 'react';
import { GetTreesResponse, FileInfo, Operation, MergeFile } from './PismoTypes';
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

  save() {
    const output: MergeFile = {
      baseBranch: this.props.leftBranchName,
      otherBranch: this.props.rightBranchName,
      operations: []
    };

    this.state.pathToMergeOperations.forEach((mergeOperations) => {
      for (const operation of mergeOperations) {
        output.operations.push(operation);
      }
    });

    const outputString = JSON.stringify(output, null, 2);
    const blob = new Blob([outputString], {type: 'text/plain'});
    const anchor = document.createElement('a');
    anchor.download = 'merge.json';
    anchor.href = window.URL.createObjectURL(blob);
    anchor.click();
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
          <button
            className="comparer-left-button"
            onClick={() => this.save()}>
            save
          </button>
          {this.renderViewPicker()}
        </div>
        <div className="split-container">
          <div className="split-child comparer-branch-title">
            {this.props.leftBranchName}
          </div>
          <div className="split-child comparer-branch-title">
            {this.props.rightBranchName}
          </div>
        </div>
      </div>
    );
  }

  getMergeOperationsForPath(path: string): Array<Operation> {
    if (!this.state.pathToMergeOperations.has(path))
      this.state.pathToMergeOperations.set(path, []);
    // @ts-ignore
    return this.state.pathToMergeOperations.get(path);
  }

  setMergeOperationsForPath(path: string, operations: Array<Operation>) {
    const pathToMergeOperations = this.state.pathToMergeOperations;
    pathToMergeOperations.set(path, operations);
    this.setState({
      pathToMergeOperations
    });
  }

  renderRow(row: {left?: FileInfo, right?: FileInfo}) {
    let path: string = '';
    if (row.left)
      path = row.left.path;
    else if (row.right)
      path = row.right.path;
    if (!path) {
      console.error('this should never happen. row: ', row);
      return [];
    }
    const mergeOperations = this.getMergeOperationsForPath(path);

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

    if (diffState === 'same' && this.state.viewStyle === 'onlyDiff')
      return [];

    // @ts-ignore
    const left: FileInfo = row.left;
    // @ts-ignore
    const right: FileInfo = row.right;

    const delet = () => {
      const deleteOperations: Array<Operation> = [];
      if (left) {
        deleteOperations.push({
          operator: 'rm',
          operands: [{
            tree: 'base',
            relativePath: path
          }]
        });
      }
      if (right) {
        deleteOperations.push({
          operator: 'rm',
          operands: [{
            tree: 'other',
            relativePath: path
          }]
        })
      }
      this.setMergeOperationsForPath(path, deleteOperations);
    };

    const copyLeft = () => {
      this.setMergeOperationsForPath(path, [{
        operator: diffState === 'diffmtime' ? 'touch': 'cp',
        operands: [{
          tree: 'base',
          relativePath: path
        }, {
          tree: 'other',
          relativePath: path
        }]
      }]);
    };

    const copyRight = () => {
      this.setMergeOperationsForPath(path, [{
        operator: diffState === 'diffmtime' ? 'touch': 'cp',
        operands: [{
          tree: 'other',
          relativePath: path
        }, {
          tree: 'base',
          relativePath: path
        }]
      }]);
    };

    const undo = () => {
      this.setMergeOperationsForPath(path, []);
    }

    let mergeState: 'none'|'copy'|'delete' = 'none';
    if (mergeOperations.length) {
      switch (mergeOperations[0].operator) {
        case 'rm':
          mergeState = 'delete';
          break;
        case 'cp':
        case 'touch':
          mergeState = 'copy';
          break;
      }
    }

    const pathText = (
      <div className="datagrid-cell monospace">
        {path}
      </div>
    );

    const renderButtonRowWithOperations = () => {
      const undoButton = (
        <button
          className="datagrid-cell datagrid-cell-no-grow comparer-left-button"
          onClick={() => undo()}>
          undo
        </button>
      );

      return [
        undoButton,
        pathText
      ];
    };

    const renderButtonRow = () => {
      if (mergeState === 'none')
        return renderButtonRowWithoutOperations();
      return renderButtonRowWithOperations();
    }

    // renders the first row with the buttons and stuff
    const renderButtonRowWithoutOperations = () => {
      const deleteButton = (
        <button
            className="datagrid-cell datagrid-cell-no-grow comparer-left-button"
            onClick={() => delet()}>
          {diffState === 'onlyone' ? 'delete' : 'delete both'}
        </button>
      );
      const pickLeftButton = (
        <button
          className="comparer-pick-button"
          onClick={() => copyLeft()}>
          pick left
        </button>
      );
      const pickRightButton = (
        <button
          className="comparer-pick-button comparer-pick-right"
          onClick={() => copyRight()}>
          pick right
        </button>
      );

      switch (diffState) {
        case 'same':
          return [
            deleteButton,
            pathText
          ];

        case 'onlyone':
          if (left) {
            return [
              deleteButton,
              pickLeftButton,
              pathText
            ];
          } else {
            return [
              deleteButton,
              pathText,
              pickRightButton
            ];
          }

        case 'diffmtime':
        case 'diffhash':
          return [
            deleteButton,
            pickLeftButton,
            pathText,
            pickRightButton
          ];
      }
    };

    const renderSummaryRowWithOperations = () => {
      const operation = mergeOperations[0];
      switch (operation.operator) {
        case 'rm':
          return (
            <div className="datagrid-cell center-text">
              deleting
            </div>
          );
        case 'touch':
        case 'cp':
          const text = operation.operator === 'cp'
            ? 'copying'
            : 'touching';
          if (operation.operands[0].tree === 'base') {
            return (
              <div className="datagrid-cell center-text">
                {text} from left to right
              </div>
            );
          } else {
            return (
              <div className="datagrid-cell center-text">
                {text} from right to left
              </div>
            );
          }
        default:
          throw new Error('this should never happen.');
      }
    };

    const renderSummaryRow = () => {
      if (mergeState === 'none')
        return renderSummaryRowWithoutOperations();
      return renderSummaryRowWithOperations();
    };

    // renders the row below the row with the filename and buttons
    const renderSummaryRowWithoutOperations = () => {
      switch (diffState) {
        case 'same':
          return (
            <div className="datagrid-cell">
              files are identical
            </div>
          );

        case 'onlyone':
          const presentDiv = <div className="datagrid-cell center-text">present</div>
          const absentDiv = <div className="datagrid-cell center-text disabled-bg-color">absent</div>
          if (left)
            return [presentDiv, absentDiv];
          else
            return [absentDiv, presentDiv];
        
        case 'diffhash':
          return (
            <div className="datagrid-cell error-bg-color">
              files have a different hash
            </div>
          );

        case 'diffmtime':
          return [
            <div className="datagrid-cell warning-bg-color">
              mtime: {fileInfoToDateString(left)}
            </div>,
            <div className="datagrid-cell warning-bg-color">
              mtime: {fileInfoToDateString(right)}
            </div>
          ];
      }
    };

    const renderDetailedRowCell = (fileInfo?: FileInfo, otherFileInfo?: FileInfo) => {
      if (!fileInfo) {
        return (
          <div className="datagrid-cell disabled-bg-color center-text">
            not present
          </div>
        );
      }

      const fileInfoToDetailFields = (fileInfo?: FileInfo): Map<string, string> => {
        const detailFields: Map<string, string> = new Map();
        if (!fileInfo)
          return detailFields;

        detailFields.set('path', fileInfo.path);
        detailFields.set('modified time', fileInfoToDateString(fileInfo));
        detailFields.set('size', filesize(fileInfo.size));
        detailFields.set('hash', fileInfo.hash);
        if (fileInfo.customAttributeNameToValue) {
          for (const [name, value] of Object.entries(fileInfo.customAttributeNameToValue)) {
            detailFields.set(name, value);
          }
        }
        return detailFields;
      }

      const detailFields = fileInfoToDetailFields(fileInfo);
      const otherDetailFields = fileInfoToDetailFields(otherFileInfo);

      return (
        <div className="datagrid-cell monospace">
          <table className="table-borders">
            <tbody>
              {Array.from(detailFields).map(([key, value]) => {
                let className = "";
                if (otherDetailFields.get(key) !== value) {
                  className = "warning-bg-color";
                }
                return (
                  <tr className={className}>
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

    const renderDetailedRow = () => {
      return (
        <div className="datagrid-cell datagrid-row">
          {renderDetailedRowCell(left)}
          {renderDetailedRowCell(right)}
        </div>
      );
    }

    const toggleExpanded = () => {
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

    return [
      <div className="datagrid-row comparer-border-bottom-soft" key={path}>
        {renderButtonRow()}
      </div>,
      <div
        className="datagrid-row comparer-bottom-row"
        onClick={() => toggleExpanded()}>
        {expanded ? renderDetailedRow() : renderSummaryRow()}
      </div>
    ];
  }

  render() {
    return (
      <div className="comparer">
        {this.renderBanner()}

        <div className="datagrid">
          {this.rows.flatMap((row, index)=> {
            return this.renderRow(row);
          })}
        </div>
      </div>
    );
  }
}

function fileInfoToDateString(fileInfo: FileInfo): string {
  return new Date(fileInfo.mtimeS * 1000).toISOString();
}

export default TreeFilesComparer;

// TODO make singular delete button turn into an undo button when you do something with the row