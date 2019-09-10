import React from 'react';
import ServerPicker from './ServerPicker.js';
import BranchesPicker from './BranchesPicker.js';
import PismoClient from './PismoClient.js';
import LoadingScreen from './LoadingScreen.js';
import './App.css';
import TreeFilesComparer from './TreeFilesComparer.js';

class App extends React.Component {
  constructor(props) {
    super(props);

    this.run();
  }

  async run() {
    const serverAddress = await new Promise(resolve => {
      const serverPicker = <ServerPicker onServerPicked={resolve} />;
      this.state = {
        currentComponent: serverPicker
      };
    });

    const pismoClient = new PismoClient(serverAddress);
    const getTreesPromise = pismoClient.getTrees();
    this.setState({
      currentComponent: <LoadingScreen promise={} />
    });
    const {trees} = await getTreesPromise;
    if (!trees.length) {
      this.setState({
        currentComponent: <p>server has no trees!</p>
      });
      return;
    }

    const [leftBranch, rightBranch] = await new Promise(resolve => {
      const branchesPicker = <BranchesPicker trees={trees} onBranchesPicked={resolve} />;
      this.setState({
        currentComponent: branchesPicker
      });
    });

    const comparer = <TreeFilesComparer trees={trees} leftBranch={leftBranch} rightBranch={rightBranch} />;
    this.setState({
      currentComponent: comparer
    })

    console.log('TODO');
  }

  render() {
    return (
      <div className="app">
        {this.state.currentComponent}
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