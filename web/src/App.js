import React from 'react';
import logo from './logo.svg';
import './App.css';
import { isConstructorDeclaration } from 'typescript';

class App extends React.Component {
  constructor(props, address) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <AddressGetter></AddressGetter>
        </header>
      </div>
    );
  }
}

class AddressGetter extends React.Component {
  constructor(props) {
    super(props);

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
    this.setState({
      getBranchesResponse
    });
  }

  render() {
    return (
      <div>
        {!this.state.getBranchesResponse ?
          <div>
            enter server address:
            <form onSubmit={this.onSubmit.bind(this)}>
              <input type="text" onChange={this.onInputChanged.bind(this)}></input>
              <input type="button" value="go"></input>
            </form>
          </div>
          : <BranchList branches={this.state.getBranchesResponse}></BranchList>
        }
      </div>
    );
  }
}

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