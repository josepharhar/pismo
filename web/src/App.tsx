import React, { ReactNode } from 'react';
import logo from './logo.svg';
import './App.css';
import ServerPicker from './ServerPicker';
import PismoClient from './PismoClient';
import LoadingScreen from './LoadingScreen';
import BranchesPicker from './BranchesPicker';
import TreeFilesComparer from './TreeFilesComparer';
import { GetTreesResponse } from './PismoTypes';

class App extends React.Component {
  state: { currentComponent: ReactNode };

  constructor(props: Readonly<{}>) {
    super(props);
    this.state = {
      currentComponent: <p>hello world</p>
    };
    this.run();
  }

  async run() {
    const serverAddress: string = await new Promise(resolve => {
      const serverPicker = <ServerPicker onServerPicked={resolve} />;
      this.state = {
        currentComponent: serverPicker
      };
    });

    const pismoClient = new PismoClient(serverAddress);
    const getTreesPromise = pismoClient.getTrees();
    this.setState({
      currentComponent: <LoadingScreen promise={getTreesPromise} />
    });
    const trees: GetTreesResponse = await getTreesPromise;
    if (!trees.trees.length) {
      this.setState({
        currentComponent: <p>server has no trees!</p>
      });
      return;
    }

    const {leftBranchName, rightBranchName} = await new Promise(resolve => {
      const branchesPicker = <BranchesPicker getTreesResponse={trees} onBranchesPicked={resolve} />
      this.setState({
        currentComponent: branchesPicker
      });
    });

    const comparer = <TreeFilesComparer
      getTreesResponse={trees}
      leftBranchName={leftBranchName}
      rightBranchName={rightBranchName} />;
    this.setState({
      currentComponent: comparer
    })

    console.log('TODO');
  }

  render() {
    return this.state.currentComponent;
  }
}

/*const App: React.FC = () => {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}*/

export default App;
