import React from 'react';

class LoadingScreen extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      finished: false
    };

    props.promise.then(() => {
      this.setState({
        finished: true
      });
    });
  }

  render() {
    if (this.state.finished) {
      return (
        <p>finished!</p>
      );
    } else {
      return (
        <p>loading...</p>
      );
    }
  }
}

export default LoadingScreen;