import React from 'react';

class ServerPicker extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      inputText: '',
    };
  }

  onInputChanged(event) {
    this.setState({
      inputText: event.target.value
    })
  }

  onSubmit(event) {
    event.preventDefault();

    if (this.props.onServerPicked) {
      this.props.onServerPicked(this.state.inputText);
    } else {
      console.error('no onServerPicked callback!');
    }
  }

  render() {
    return (
      <div>
        <div>
          enter server address, then press enter:
          <form onSubmit={this.onSubmit.bind(this)}>
            <input type="text" onChange={this.onInputChanged.bind(this)}></input>
          </form>
        </div>
      </div>
    );
  }
}

export default ServerPicker;