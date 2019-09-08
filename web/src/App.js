import React from 'react';
//import {BrowserRouter as Router, Route, Link} from 'react-router-dom';
import './App.css';

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      currentComponent: new ServerPicker(this)
    };
  }

  render() {
    return (
      <div className="app">
        {this.state.currentComponent.render()}
      </div>
    );
  }
}

class LoadingPage extends React.Component {
  constructor(app, promise) {
    super();
    this.app = app;
    promise.then(component => {
      this.app.setState({
        currentComponent: component
      });
    });
  }

  render() {
    return (
      <div>loading...</div>
    );
  }
}

class ServerPicker extends React.Component {
  constructor(app, props) {
    super(props);

    this.app = app;

    this.state = {
      inputText: '',
      getBranchesResponse: null
    };
  }

  onInputChanged(event) {
    this.setState({
      inputText: event.target.value
    })
  }

  onSubmit(event) {
    event.preventDefault();
    console.log('submit, this.state.inputText: ' + this.state.inputText);
    const getBranchesResponse = [
      {
        name: 'music',
        path: 'E:\\music',
        lastUpdated: 1234,
        numFiles: 11749,
        totalSize: 12341234
      },
      {
        name: 'rofl',
        path: 'C:\\lol',
        lastUpdated: 12341234,
        numFiles: 12341234,
        totalSize: 12341234
      }
    ];

    this.app.setState({
      currentComponent: new BranchesPicker(this.app, getBranchesResponse)
    });
  }

  render() {
    return (
      <div>
        <div>
          enter server address:
          <form onSubmit={this.onSubmit.bind(this)}>
            <input type="text" onChange={this.onInputChanged.bind(this)}></input>
            <input type="button" value="go"></input>
          </form>
        </div>
      </div>
    );
  }
}

class BranchesPicker extends React.Component {
  constructor(app, getBranchesResponse, props) {
    super(props);
    this.app = app;
    this.getBranchesResponse = getBranchesResponse;
    this.state = {};
  }

  renderBranches(groupId) {
    return this.getBranchesResponse.map((branch, index)=> {
      const id = `${branch.name}-${groupId}`
      return (
        <div key={id}>
          {index === 0
            ? <input type="radio" id={id} name={groupId} />
            : <input type="radio" id={id} name={groupId} />}
          <label htmlFor={id}>{branch.name}</label>
        </div>
      );
    });
  }

  onButtonClicked() {
    console.log('TODO');
    const fakeTreeFileOne = {
      path: '/fake/tree/file/one',
      lastUpdated: 1234,
      files: [
        {
          path: '/subresource_one',
          mtimeS: 1234,
          mtimeNs: 5678,
          size: 1234,
          hash: 'hash'
        },
        {
          path: '/subresource_two',
          mtimeS: 1234,
          mtimeNs: 5678,
          size: 1234,
          hash: 'hash'
        }
      ]
    };
    const fakeTreeFileTwo = {
      path: '/fake/tree/file/two',
      lastUpdated: 1234,
      files: [
        {
          path: '/subresource_one',
          mtimeS: 1234,
          mtimeNs: 5678,
          size: 1234,
          hash: 'hash'
        },
        {
          path: '/subresource_three',
          mtimeS: 1234,
          mtimeNs: 5678,
          size: 1234,
          hash: 'hash'
        }
      ]
    };
    this.app.setState({
      currentComponent: new TreeFilesComparer(this.app, fakeTreeFileOne, fakeTreeFileTwo)
    })
  }

  render() {
    return (
      <div className="branches-picker">
        <div className="split-container">
          <div className="split-child">
            {this.renderBranches('left')}
          </div>
          <div className="split-child">
            {this.renderBranches('right')}
          </div>
        </div>
        <div className="center">
          <button onClick={this.onButtonClicked.bind(this)}>
            go
          </button>
        </div>
      </div>
    );
  }
};

class TreeFilesComparer extends React.Component {
  constructor(app, treeFileOne, treeFileTwo, props) {
    super(props);
    this.app = app;
    this.treeFileOne = treeFileOne;
    this.treeFileTwo = treeFileTwo;

    /** @type {!Array<{left: ?FileInfo, right: ?FileInfo}>} */
    let rows = [];
    const leftFiles = this.treeFileOne.files;
    const rightFiles = this.treeFileTwo.files;
    let leftIndex = 0;
    let rightIndex = 0;
    while (leftIndex < leftFiles.length || rightIndex < rightFiles.length) {
      const leftFilename = leftIndex < leftFiles.length ? leftFiles[leftIndex].path : null;
      const rightFilename = rightIndex < rightFiles.length ? rightFiles[rightIndex].path : null;
      if (!leftFilename || rightFilename < leftFilename) {
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
    function fileToCell(file, key) {
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
    rows = rows.map((row, index) => {
      return [fileToCell(row.left, `left-${index}`), fileToCell(row.right, `right-${index}`)];
    });
    this.datagrid = new DataGrid(rows);

    this.state = {};
  }

  render() {
    return this.datagrid.render();
  }
}

class DataGrid extends React.Component {
  /**
   * @param {!Array<!Array<!Element>>} rows 
   */
  constructor(rows) {
    super();
    this.rows = rows;
  }

  render() {
    return (
      <div className="datagrid">
        {this.rows.map(row => {
          return (
            <div className="datagrid-row">
              {row.map(cell => {
                return (
                  <div className="datagrid-cell">{cell}</div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }
}

export default App;

// Workflow:
// - pick server?
// - pick two branches to compare
// - get a list with each of them with a toggle button to show things that are ok or not with expandable details of each file and buttons to delete or copy to the other side... or rename?

// TODO add a checkbox for dry run mode