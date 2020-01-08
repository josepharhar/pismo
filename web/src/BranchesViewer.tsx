import React, { ReactNode } from 'react';
import PismoClient from './PismoClient';
import { GetTreesResponse } from './PismoTypes';

interface Props {
  getTreesResponse: GetTreesResponse;
  pismoClient: PismoClient;
}

export default class BranchesViewer extends React.Component<Props> {
  constructor(props: Props) {
    super(props);
  }

  deleteTree(treename: string) {
    if (!window.confirm('are you sure you want to delete "' + treename + '"?'))
      return;

    this.props.pismoClient.deleteTree(treename);
  }

  updateTree(treename: string) {
    this.props.pismoClient.updateTree(treename);
  }

  render() {
    return (
      <div>
        <p>branches viewer</p>
        <button onClick={() => window.alert('not implemented')}>add</button>
        {this.props.getTreesResponse.trees.map(tree => {
          <div>
            <button onClick={() => this.deleteTree(tree.treename)}>delete</button>
            <button onClick={() => this.updateTree(tree.treename)}>update</button>
            {tree.treename}
          </div>
        })}
      </div>
    );
  }
}