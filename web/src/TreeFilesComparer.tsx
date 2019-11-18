import React from 'react';
import { GetTreesResponse, FileInfo, Operation, MergeFile, TreeFile, GetRemotesResponse } from './PismoTypes';
import './TreeFilesComparer.css';
import './DataGrid.css';
import filesize from 'filesize';
import { mirrorBaseToOther, twoWayMerge, oneWayAdd } from './AutoMerger';
import { PismoBranch } from './PismoBranch';

interface Props {
  getRemotesResponse: GetRemotesResponse;
  getTreesResponse: GetTreesResponse;
  leftBranchName: string;
  rightBranchName: string;
  hostname: string;
}
interface DupeData {
  operations: Array<Operation>;
  selectedPath: string;
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
    hashToDupeData: Map<string, DupeData>;
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
      pathToMergeOperations: new Map(),
      hashToDupeData: new Map()
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
    const addFile = (file: FileInfo, side: 'left'|'right') => {
      let filesWithHash = hashToFiles.get(file.hash);
      if (!filesWithHash) {
        filesWithHash = {left: [], right: []};
        hashToFiles.set(file.hash, filesWithHash);
      }
      filesWithHash[side].push(file);
    }
    this.leftTreeFile.files.forEach(file => addFile(file, 'left'));
    this.rightTreeFile.files.forEach(file => addFile(file, 'right'));
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

  generateMergeFile() {
    const output: MergeFile = {
      baseBranch: this.props.leftBranchName,
      otherBranch: this.props.rightBranchName,
      operations: []
    };

    const addMergeOperations = (mergeOperations: Array<Operation>) => {
      const cpOperations = [];
      const rmOperations = [];
      const touchOperations = [];
      const mvOperations = [];

      for (const operation of mergeOperations) {
        switch (operation.operator) {
          case 'cp':
            cpOperations.push(operation);
            break;
          case 'rm':
            rmOperations.push(operation);
            break;
          case 'touch':
            touchOperations.push(operation);
            break;
          case 'mv':
            mvOperations.push(operation);
            break;
        }
      }

      output.operations = output.operations.concat(mvOperations);
      output.operations = output.operations.concat(cpOperations);
      output.operations = output.operations.concat(rmOperations);
      output.operations = output.operations.concat(touchOperations);
    };

    this.state.pathToMergeOperations.forEach(addMergeOperations);
    this.state.hashToDupeData.forEach(dupeData => addMergeOperations(dupeData.operations));

    return output;
  }

  apply() {
    const mergeFile = this.generateMergeFile();
    fetch('http://' + this.props.hostname + '/apply', {
      method: 'POST',
      body: JSON.stringify(mergeFile),
      headers: {
        'content-type': 'application/json'
      }
    }).catch(error => {
      console.log('fetch /apply error: ', error);
    });
  }

  save() {
    const output = this.generateMergeFile();
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
          <button onClick={() => this.apply()}>apply</button>
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
            key={path + ' comparer-button-row-child'}
            className="comparer-button-row-child"
            onClick={() => undo()}>
              undo
          </button>
        ];
      }

      const key =
        'left' + (left ? left.path : 'null')
        + 'right' + (right ? right.path : 'null');
      const deleteButton = (
        <button
            key={'deleteButton' + key}
            className="comparer-button-row-child comparer-left-button"
            onClick={() => delet()}>
          {diffState === 'onlyone' ? 'delete' : 'delete both'}
        </button>
      );
      const pickLeftButton = (
        <button
          key={'pickLeftButton' + key}
          className="comparer-button-row-child comparer-pick-button"
          onClick={() => copyLeft()}>
          pick left
        </button>
      );
      const pickRightButton = (
        <button
          key={'pickRightButton' + key}
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

      return <span key={path + ' status icon'} className={className} title={tooltipText}> {text} </span>;
    }

    const renderButtonRow = () => {
      return [
        <div className="comparer-button-row-container" key={path + ' comparer-button-row-container'}>
          {renderButtonRowItems()}
        </div>,
        renderStatusIcon(),
        <span className="monospace clip-overflow cursor-pointer"
            onClick={() => toggleExpanded()}
            key={path + ' omaewa'}>
          {path}
        </span>
      ];
    }

    const renderDetailedRowCell = (branchName: string, fileInfo?: FileInfo, otherFileInfo?: FileInfo) => {
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
          <button type="button" onClick={() => {

            // determine by parsing if branch is remote and should use remote address
            let actionSite = '';
            const branch = new PismoBranch(branchName);
            if (branch.remote()) {
              // this branch has a remote, so go to that url instead
              const remote = this.props.getRemotesResponse.remotes.find(remote => remote.name === branch.remote());
              if (remote) {
                actionSite = remote.url;
              }
            }

            // TODO figure out which server to go to based on...
            const form = document.createElement('form');
            document.body.appendChild(form);
            form.method = 'GET';
            form.action = `${actionSite}/get-trees/${encodeURIComponent(branchName)}/${encodeURIComponent(fileInfo.path)}`;
            form.target = '_blank'; // open in new tab
            form.submit();
            // TODO there should be a WPT for this without the setTimeout?
            setTimeout(() => document.body.removeChild(form), 0);
          }}>
            open file
          </button>
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
          {renderDetailedRowCell(this.props.leftBranchName, left, right)}
          {renderDetailedRowCell(this.props.rightBranchName, right, left)}
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

  renderDuplicatesRow(
      hash: string,
      leftFiles: Array<FileInfo>,
      rightFiles: Array<FileInfo>,
      leftWastedSpace: number,
      rightWastedSpace: number) {
    const rows: Array<JSX.Element> = [];
    const addFile = (side: 'left'|'right', file: FileInfo) => {

      const choosePath = () => {
        const hashToDupeData = this.state.hashToDupeData;
        const files = this.hashToDuplicateFiles.get(file.hash);
        if (!files) return;
        const operations: Array<Operation> = [];
        // files.left must have one copy at the right path,
        // and files.right must also have only one copy at the right path.
        // if one side doesn't have any copy of the file, then just do nothing with that side.

        const addOperationsForSide = (files: Array<FileInfo>, side: 'left'|'right') => {
          if (!files.length)
            return;

          const path = file.path;
          const sideToProtocol: 'base'|'other' = side === 'left' ? 'base' : 'other';

          const deleteFile = (file: FileInfo) => {
            operations.push({
              operator: 'rm',
              operands: [{
                tree: sideToProtocol,
                relativePath: file.path
              }]
            });
          };

          // do we already have a file in the right spot? if so just delete the others.
          if (files.find(file => file.path === path)) {
            // delete all but the one we found
            for (const file of files) {
              if (file.path === path)
                continue;
              deleteFile(file);
            }

          } else {
            // move the first occurence to the desired path,
            // then delete the rest.
            operations.push({
              operator: 'mv',
              operands: [{
                tree: sideToProtocol,
                relativePath: files[0].path
              }, {
                tree: sideToProtocol,
                relativePath: path
              }]
            });
            for (let i = 1; i < files.length; i++) {
              deleteFile(files[i]);
            }
          }
        };

        addOperationsForSide(leftFiles, 'left');
        addOperationsForSide(rightFiles, 'right');
        hashToDupeData.set(file.hash, {operations, selectedPath: file.path});
        this.setState({
          hashToDupeData
        });
      };

      const undo = () => {
        this.state.hashToDupeData.delete(file.hash);
        this.setState({
          hashToDupeData: this.state.hashToDupeData
        });
      };

      const chooseButton = (
        <button
          title="choose this path for all duplicate files"
          onClick={() => choosePath()}>
          choose this path
        </button>
      );

      const undoButton = (
        <button
          title="undo changes for this hash"
          onClick={() => undo()}>
          undo
        </button>
      )

      // is this row's path being picked?
      const dupeData = this.state.hashToDupeData.get(file.hash);
      if (dupeData && dupeData.selectedPath === file.path) {
      }

      let mergeState: 'none'|'deleting'|'selecting' = 'none';
      if (dupeData) {
        if (dupeData.selectedPath === file.path) {
          mergeState = 'selecting';
        } else {
          mergeState = 'deleting';
        }
      }

      let button = null;
      let className = 'comparer-duplicates-path monospace';
      switch (mergeState) {
        case 'none':
          button = chooseButton;
          break;
        case 'deleting':
          button = <button disabled>deleting</button>
          className += ' strikethrough';
          break;
        case 'selecting':
          button = undoButton;
          break;
      }

      rows.push(
        <div className="comparer-duplicates-row-entry">
          {button}
          <div className="comparer-duplicates-branch">
            {side === 'left' ? this.props.leftBranchName : this.props.rightBranchName}
          </div>
          <div className={className}>
            {file.path}
          </div>
        </div>
      );
    };
    leftFiles.forEach(file => addFile('left', file));
    rightFiles.forEach(file => addFile('right', file));

    return [
      <div className="datagrid-row comparer-duplicates-title">
        hash: {hash}
        <br /> left wasted space: {filesize(leftWastedSpace)}<br />
        right wasted space: {filesize(rightWastedSpace)}
      </div>
    ].concat(rows);
  }

  chooseLeftDuplicates() {
    throw new Error('TODO');
  }

  chooseRightDuplicates() {
    throw new Error('TODO');
  }

  renderDuplicates() {
    const rows = Array.from(this.hashToDuplicateFiles.entries())
      .map(([hash, files]) => {
        const getWastedSpace = (files: Array<FileInfo>) => {
          if (files.length < 2)
            return 0;
          return files[0].size * (files.length - 1);
        };
        return {
          hash,
          left: files.left,
          right: files.right,
          leftWastedSpace: getWastedSpace(files.left),
          rightWastedSpace: getWastedSpace(files.right)
        };
      }).sort((a, b) => {
        // larger files should have lower index
        // if a is bigger then return less than zero
        const aWastedSpace = a.leftWastedSpace + a.rightWastedSpace;
        const bWastedSpace = b.leftWastedSpace + b.rightWastedSpace;
        if (aWastedSpace > bWastedSpace) {
          return -1;
        } else if (aWastedSpace < bWastedSpace) {
          return 1;
        } else {
          return 0;
        }
      });

    return [
      <button
        onClick={() => this.chooseLeftDuplicates()}>
        choose left paths
      </button>,
      <button
        onClick={() => this.chooseRightDuplicates()}>
        choose right paths
      </button>,
      <div className="datagrid">
        {rows.flatMap(row => {
          return this.renderDuplicatesRow(row.hash, row.left, row.right, row.leftWastedSpace, row.rightWastedSpace);
        })}
      </div>
    ];
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