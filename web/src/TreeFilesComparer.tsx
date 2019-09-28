import React, { ReactNode } from 'react';
import { GetTreesResponse, FileInfo, Operation, MergeFile, TreeFile } from './PismoTypes';
import './TreeFilesComparer.css';
import './DataGrid.css';
//import { FixedSizeList } from 'react-window';
import filesize from 'filesize';
import { mirrorBaseToOther, twoWayMerge, oneWayAdd } from './AutoMerger';
import { JSXElement } from '@babel/types';

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
    viewStyle: 'all'|'onlyDiff'|'onlyChanges'|'onlyDuplicates';
    pathToMergeOperations: Map<string, Array<Operation>>;
  };

  leftTreeFile: TreeFile;
  rightTreeFile: TreeFile;
  lastPathModified?: string;
  hashToDuplicateFiles: Map<string, {left: Array<FileInfo>, right: Array<FileInfo>}>;

  constructor(props: Props) {
    super(props);

    this.state = {
      expandedPaths: new Set(),
      viewStyle: 'all',
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
    this.leftTreeFile = treeFileOne;
    this.rightTreeFile = treeFileTwo;

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

    // populate hashToDuplicateFiles
    const hashToFiles: Map<string, {left: Array<FileInfo>, right: Array<FileInfo>}> = new Map();
    const addFile = (file: FileInfo) => {
      if (!hashToFiles.has(file.hash)) {
        hashToFiles.set(file.hash, {left: [], right: []});
      }
    }
    this.leftTreeFile.files.forEach(addFile);
    this.rightTreeFile.files.forEach(addFile);
    this.hashToDuplicateFiles = new Map();
    hashToFiles.forEach((files, hash) => {
      const multipleFilesInOneSide = files.left.length > 1 || files.right.length > 1;
      const singularFilesHaveDifferentPath =
        files.left.length && files.right.length && files.left[0].path !== files.right[0].path;
      if (multipleFilesInOneSide || singularFilesHaveDifferentPath) {
        this.hashToDuplicateFiles.set(hash, files);
      }
    });
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
            name="view-only-diff"
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
        <label>
          <input
            type="radio"
            name="view-only-operations"
            checked={this.state.viewStyle === 'onlyChanges'}
            onChange={event => {
              if (!event.target.checked)
                return;
              this.setState({
                viewStyle: 'onlyChanges'
              });
            }} />
            only changes
        </label>
        <label>
          <input
            type="radio"
            name="view-only-duplicates"
            checked={this.state.viewStyle === 'onlyDuplicates'}
            onChange={event => {
              if (!event.target.checked)
                return;
              this.setState({
                viewStyle: 'onlyDuplicates'
              });
            }} />
            duplicates
        </label>
      </span>
    );
  }

  overwriteOperations(newOperations: Array<Operation>) {
    const pathToMergeOperations = new Map();
    for (const operation of newOperations) {
      const path = operation.operands[0].relativePath;
      let operations = [];
      if (pathToMergeOperations.has(path))
        operations = pathToMergeOperations.get(path);
      operations.push(operation);
      pathToMergeOperations.set(path, operations);
    }
    this.setState({
      pathToMergeOperations
    });
  }

  renderPresetPicker() {
    return (
      <span style={{border: '1px solid black'}}>
        apply preset:
        <button
          onClick={() => this.overwriteOperations(mirrorBaseToOther(this.leftTreeFile, this.rightTreeFile))}>
          mirror "{this.props.leftBranchName}" => "{this.props.rightBranchName}"
        </button>
        <button
          onClick={() => this.overwriteOperations(mirrorBaseToOther(this.rightTreeFile, this.leftTreeFile))}>
          mirror "{this.props.rightBranchName}" => "{this.props.leftBranchName}"
        </button>
        <button
          onClick={() => this.overwriteOperations(oneWayAdd(this.leftTreeFile, this.rightTreeFile))}>
          one way update "{this.props.leftBranchName}" => "{this.props.rightBranchName}"
        </button>
        <button
          onClick={() => this.overwriteOperations(oneWayAdd(this.rightTreeFile, this.leftTreeFile))}>
          one way update "{this.props.rightBranchName}" => "{this.props.leftBranchName}"
        </button>
        <button
          onClick={() => this.overwriteOperations(twoWayMerge(this.leftTreeFile, this.rightTreeFile))}>
          two-way merge
        </button>
      </span>
    );
  }

  revertChangesBelowLastChange() {
    if (!this.lastPathModified)
      return;

    const modifiedPaths: Set<string> = new Set();
    this.state.pathToMergeOperations.forEach((value, key) => {
      modifiedPaths.add(key);
    });

    if (!modifiedPaths.has(this.lastPathModified))
      return;

    const alphabeticalModifiedPaths: Array<String> = [];
    modifiedPaths.forEach(path => {
      alphabeticalModifiedPaths.push(path);
    });
    alphabeticalModifiedPaths.sort();

    const pathsToKeep: Set<String> = new Set();
    const lastIndex = alphabeticalModifiedPaths.indexOf(this.lastPathModified);
    for (let i = 0; i <= lastIndex; i++) {
      pathsToKeep.add(alphabeticalModifiedPaths[i]);
    }

    const pathToMergeOperations = new Map();
    this.state.pathToMergeOperations.forEach((value, key) => {
      if (pathsToKeep.has(key)) {
        pathToMergeOperations.set(key, value);
      }
    });
    this.setState({
      pathToMergeOperations
    });
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
          {this.renderPresetPicker()}
          <button onClick={() => this.revertChangesBelowLastChange()}>
            revert all changes below last change
          </button>
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
    this.lastPathModified = path;
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

    if (mergeState === 'none' && this.state.viewStyle === 'onlyChanges')
      return [];

    const renderButtonRowItems = () => {
      if (mergeState !== 'none') {
        return [
          <button
            className="comparer-button-row-child"
            onClick={() => undo()}>
              undo
          </button>
        ];
      }

      const deleteButton = (
        <button
            className="comparer-button-row-child comparer-left-button"
            onClick={() => delet()}>
          {diffState === 'onlyone' ? 'delete' : 'delete both'}
        </button>
      );
      const pickLeftButton = (
        <button
          className="comparer-button-row-child comparer-pick-button"
          onClick={() => copyLeft()}>
          pick left
        </button>
      );
      const pickRightButton = (
        <button
          className="comparer-button-row-child comparer-pick-button"
          onClick={() => copyRight()}>
          pick right
        </button>
      );

      switch (diffState) {
        case 'same':
          return [
            deleteButton
          ];

        case 'onlyone':
          if (left) {
            return [
              deleteButton,
              pickLeftButton
            ];
          } else {
            return [
              deleteButton,
              pickRightButton
            ];
          }

        case 'diffmtime':
        case 'diffhash':
          return [
            deleteButton,
            pickLeftButton,
            pickRightButton
          ];
      }
    };

    const renderStatusIcon = () => {
      const filledSquare = '\u2b1b';
      const emptySquare = '\u2b1c';
      const leftArrow = '\u2190';
      const rightArrow = '\u2192';

      const leftIcon = left ? filledSquare : emptySquare;
      const rightIcon = right ? filledSquare : emptySquare;
      let color: 'white'|'yellow'|'green'|'blue'|'red' = 'white';
      let text = `${leftIcon}   ${rightIcon}`;
      let className = '';
      let tooltipText = '';

      switch (mergeState) {
        case 'none':
          switch (diffState) {
            case 'same':
              color = 'green';
              text = `${leftIcon} = ${rightIcon}`;
              tooltipText = `"${this.props.leftBranchName}" and "${this.props.rightBranchName}" are identical`;
              break;
            case 'onlyone':
              color = 'red';
              text = `${leftIcon}   ${rightIcon}`;
              tooltipText = left
                ? `"${this.props.leftBranchName}" has this file, "${this.props.rightBranchName}" does not`
                : `"${this.props.leftBranchName}" doesn't have this file, "${this.props.rightBranchName}" has it`;
              break;
            case 'diffhash':
              color = 'red';
              text = `${leftIcon} ~ ${rightIcon}`;
              tooltipText = `files have different contents`;
              break;
            case 'diffmtime':
              color = 'yellow';
              text = `${leftIcon} ~ ${rightIcon}`;
              tooltipText = `files have different modified time, but same content`;
              break;
          }
          break;

        case 'copy':
          color = 'blue';
          const arrowIcon = mergeOperations[0].operands[0].tree === 'base' ? rightArrow : leftArrow;
          text = `${leftIcon} ${arrowIcon} ${rightIcon}`;
          tooltipText = `copying "${this.props.leftBranchName}" ${arrowIcon} "${this.props.rightBranchName}"`;
          break;

        case 'delete':
          color = 'blue';
          className = 'strikethrough';
          text = `${leftIcon}   ${rightIcon}`;
          if (left && right) {
            tooltipText = `deleting both "${this.props.leftBranchName}"s and "${this.props.rightBranchName}"s copies of this file`;
          } else if (left) {
            tooltipText = `deleting "${this.props.leftBranchName}"s copy of this file`;
          } else {
            tooltipText = `deleting "${this.props.rightBranchName}"s copy of this file`;
          }
          break;
      }

      switch (color) {
        case 'white':
          break;
        case 'blue':
          className += ' blue-bg-color';
          break;
        case 'green':
          className += ' green-bg-color';
          break;
        case 'red':
          className += ' error-bg-color';
          break;
        case 'yellow':
          className += ' warning-bg-color';
          break;
      }

      className += ' monospace comparer-status-icon';

      return <span className={className} title={tooltipText}> {text} </span>;
    }

    const renderButtonRow = () => {
      return [
        <div className="comparer-button-row-container">
          {renderButtonRowItems()}
        </div>,
        renderStatusIcon(),
        <span className="monospace clip-overflow cursor-pointer" onClick={() => toggleExpanded()}>
          {path}
        </span>
      ];
    }

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

    const output = [
      <div className="datagrid-row comparer-border-bottom-soft clip-overflow" key={path}>
        {renderButtonRow()}
      </div>
    ];

    if (expanded) {
      output.push(
      <div
        className="datagrid-row comparer-bottom-row">
        {renderDetailedRow()}
      </div>
      );
    }

    return output;
  }

  renderDuplicatesRow(hash: string, leftFiles: Array<FileInfo>, rightFiles: Array<FileInfo>) {
    const rows: Array<JSX.Element> = [];
    const addFile = (side: 'left'|'right', file: FileInfo) => {
      rows.push(
        <div className="comparer-duplicates-row">
          <div className="comparer-duplicates-branch">
            {side === 'left' ? this.props.leftBranchName : this.props.rightBranchName}
          </div>
          <div className="comparer-duplicates-path monospace">
            {file.path}
          </div>
        </div>
      );
    };
    leftFiles.forEach(file => addFile('left', file));
    rightFiles.forEach(file => addFile('right', file));

    return [
      <div className="datagrid-row">
        hash: {hash}
      </div>
    ].concat(rows);
  }

  renderDuplicates() {
    return (
      <div className="datagrid">
        {Array.from(this.hashToDuplicateFiles.entries()).flatMap(([hash, files])=> {
          return this.renderDuplicatesRow(hash, files.left, files.right);
        })}
      </div>
    );
  }

  render() {
    return (
      <div className="comparer">
        {this.renderBanner()}

        {this.state.viewStyle === 'onlyDuplicates' ? this.renderDuplicates() :
          <div className="datagrid">
            {this.rows.flatMap((row, index)=> {
              return this.renderRow(row);
            })}
          </div>}
      </div>
    );
  }
}

function fileInfoToDateString(fileInfo: FileInfo): string {
  return new Date(fileInfo.mtimeS * 1000).toISOString();
}

export default TreeFilesComparer;