import React from 'react';
import { GetTreesResponse } from './PismoTypes';

interface Props {
  getTreesResponse: GetTreesResponse;
  onBranchesPicked: (branchNames: {leftBranchName: string, rightBranchName: string}) => void;
}

class BranchesPicker extends React.Component<Props> {
  state: {
    left: string;
    right: string;
  };

  constructor(props: Props) {
    super(props);
    const {trees} = props.getTreesResponse;
    if (!trees) console.error('!trees');
    if (!trees.length) console.error('!trees.length');

    this.state = {
      left: trees[0].treename,
      right: trees[0].treename
    };
  }

  renderBranches(groupId: 'left'|'right') {
    return this.props.getTreesResponse.trees.map((tree, index) => {
      const { treename } = tree;
      const id = `${groupId}-${treename}`;

      return (
        <div key={id}>
          <label>
            <input
              type="radio"
              name={groupId}
              checked={this.state[groupId] === treename}
              onChange={event => {
                if (!event.target.checked)
                  return;
                const newState: {left?: string; right?: string;} = {};
                newState[groupId] = treename;
                this.setState(newState);
              }} />
            {treename}
          </label>
        </div>
      );
    });
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
          <button onClick={event => {
              console.log('calling onBranchesPicked. left: ' + this.state.left + ', right: ' + this.state.right);
              this.props.onBranchesPicked({
                leftBranchName: this.state.left,
                rightBranchName: this.state.right
              });
            }}>
            go
          </button>
        </div>
      </div>
    );
  }
};

export default BranchesPicker;