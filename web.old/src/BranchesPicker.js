import React from 'react';

class BranchesPicker extends React.Component {
  constructor(props) {
    super(props);
    const trees = props.trees;
    if (!trees) console.error('!trees');
    if (!trees.length) console.error('!trees.length');

    this.state = {
      left: trees[0].name,
      right: trees[0].name
    };
  }

  renderBranches(groupId) {
    return this.props.trees.map((tree, index) => {

      const {treename, treefile} = tree;
      const {path, lastUpdated, files} = treefile;

      const id = `${groupId}-${treename}`;

      return (
        <div key={id}>
          <label>
            <input
              type="radio"
              name={groupId}
              checked={this.state[groupId] === treename}
              onChange={event => {
                const newState = {};
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
              this.props.onBranchesPicked([this.state.left, this.state.right]);
            }}>
            go
          </button>
        </div>
      </div>
    );
  }
};

export default BranchesPicker;