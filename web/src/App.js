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
      <div class="app">
        {this.state.currentComponent.render()}
      </div>
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
        <div>
          {index === 0
            ? <input type="radio" id={id} name={groupId} checked />
            : <input type="radio" id={id} name={groupId} />}
          <label for={id}>{branch.name}</label>
        </div>
      );
    });
  }

  render() {
    return (
      <div class="split-container">
        <div class="split-child">
          {this.renderBranches('left')}
        </div>
        <div class="split-child">
          {this.renderBranches('right')}
        </div>
      </div>
    );
  }
};

class BranchList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <div>
        {this.props.branches.map((branch, index)=> {
          return (
            <div key={index}>
              <p>name: {branch.name}</p>
              <p>branch: {branch.path}</p>
              <p>lastUpdated: {branch.lastUpdated}</p>
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