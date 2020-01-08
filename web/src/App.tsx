import React, { ReactNode } from 'react';
import './App.css';
import ServerPicker from './ServerPicker';
import PismoClient from './PismoClient';
import LoadingScreen from './LoadingScreen';
import BranchesPicker from './BranchesPicker';
import TreeFilesComparer from './TreeFilesComparer';
import { GetTreesResponse } from './PismoTypes';
import RemotesViewer from './RemotesViewer';
import BranchesViewer from './BranchesViewer';

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
      const serverPicker = <ServerPicker onServerPicked={resolve} />;
      this.state = {
        currentComponent: serverPicker
      };
    });

    const pismoClient = new PismoClient(serverAddress);
    const allRequests = Promise.all([pismoClient.getTrees(), pismoClient.getRemotes()])
    this.setState({
      currentComponent: <LoadingScreen promise={allRequests} />
    });
    let [trees, remotes] = await allRequests;
    if (!trees.trees.length) {
      this.setState({
        currentComponent: <p>server has no trees!</p>
      });
      return;
    }

    const onBranchesPicked = (branchNames: {leftBranchName: string, rightBranchName: string}) => {
      const comparer = <TreeFilesComparer
        serverAddress={serverAddress}
        hostname={serverAddress}
        getTreesResponse={trees}
        getRemotesResponse={remotes}
        leftBranchName={branchNames.leftBranchName}
        rightBranchName={branchNames.rightBranchName} />;
      this.setState({
        currentComponent: comparer
      });
    };

    this.setState({
      currentComponent: <div className="pismo-app-main-container">{[
        <RemotesViewer pismoClient={pismoClient} />,
        <BranchesViewer pismoClient={pismoClient} />,
        <BranchesPicker getTreesResponse={trees} onBranchesPicked={onBranchesPicked} />
      ]}</div>
    })
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



// i need to make the frontend do more than just this one use case.
// i need to change the backend to make it have a centralized task server and get rid of the cli stuff
// i need the frontend to be able to have a sort of task view and see what its doing and get all the progress for it

// the ui:
// when i connect to a backend, i want to
// 1. see the tasks it has going
//    - be able to pull up a detailed view that constantly updates to show how far it is, what its doing, etc.
// 2. see its remotes, remove/add/fetchfrom remotes
// 3. see the branches, remove/add/scan branches
// 4. compare/merge branches

// and how should i populate all this information?
// i could:
// - make the server render the html with the information
// - make http endpoints for all the needed underlying information
// - make a websocket connection
// making a websocket sounds like a better version of the endpoints idea... or is it?
// because what happens if you lose the websocket or something?
// i guess ill just keep the current architecture, because changing things would suck