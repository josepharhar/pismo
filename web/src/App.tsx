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
        currentComponent: <p>error: {error.stack}</p>
      });
    });
  }

  async run() {
    const serverAddress: string = await new Promise(resolve => {
      // TODO this is gonna be bad UX
      // probe for local pismo server
      fetch('http://localhost:48880/version')
        .then(response => {
          if (response.ok)
            resolve('localhost:48880');
        }).catch(error => {
          console.log('http://localhost:48880 version fetch failed: ', error);
        });

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

// another toolbar:
// twosplit centered text with name of each branch
// can i also put the absolute path of each one? maybe have it be expandable?
// center another button to save/export/apply changes

// file difference cases:
// 1. files have the same hash and mtime
//    - make entire row have green bg color
//    - put text saying theyre the same?
//    - buttons:
//      - delete both
// 2. files have the same hash but different mtime
//    - make entire row have yellow bg color
//    - add text saying files are identical with different mtime?
//    - visually indicate which file is newer
//    - buttons:
//      - delete both
//      - copy mtime on both sides
// 3. files have different hashes (mtime doesn't matter)
//    - make entire row have red bg color
//    - add text saying files are different
//    - visually indicate which file is newer
//    - buttons:
//      - delete both
//      - copy file (and mtime) on each side
// 4. one file is present and the other is not
//    - make entire row... red or gray?
//    - buttons:
//      - delete both
//      - copy file (and mtime) on each side

// use cases:
// 1. copy mtime from one file to another
// 2. copy contents and mtime from one file to another
// 3. delete one file and keep the other
// 4. delete both files

// TODO make it so you can apply a preset to all the files from the toolbar?