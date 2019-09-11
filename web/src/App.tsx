import React, { ReactNode } from 'react';
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
    this.run().catch(error => {
      // TODO turn this off for production?
      this.setState({
        currentComponent: <p>error: ${error}</p>
      });
    });
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
    let trees: GetTreesResponse = await getTreesPromise;
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
    });
  }

  render() {
    return this.state.currentComponent;
  }
}

export default App;

// TODO add a checkbox for dry run mode
// TODO make the files expandable for more info or have a tooltip or expanded / not expanded mode
// TODO use viewporting with a search menu to find the right file that fuzzy searches for a file then you press enter on a dropdown and go to that one
