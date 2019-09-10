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
                const newState = {
                  left: groupId === 'left' ? treename : null,
                  right: groupId === 'right' ? treename : null
                };
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