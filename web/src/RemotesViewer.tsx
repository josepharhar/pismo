import React from 'react';
import PismoClient from './PismoClient';

interface Props {
  pismoClient: PismoClient;
}

export default class RemotesViewer extends React.Component<Props> {
  render() {
    return (
      <div>
        <p>remotes viewer</p>
      </div>
    );
  }
}