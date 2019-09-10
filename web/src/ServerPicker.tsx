import React from 'react';

interface Props {
  onServerPicked: (serverAddress: string) => void;
}

class ServerPicker extends React.Component<Props> {
  state = {
    inputText: ''
  };

  render() {
    return (
      <div>
        <div>
          enter server address, then press enter:
          <form onSubmit={event => {
              event.preventDefault();
              this.props.onServerPicked(this.state.inputText);
            }}>
            <input type="text" onChange={event => {
              this.setState({inputText: event.target.value});
            }} />
          </form>
        </div>
      </div>
    );
  }
}

export default ServerPicker;