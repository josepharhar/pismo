import React from 'react';

interface Props {
  promise: Promise<any>;
}

class LoadingScreen extends React.Component<Props> {
  state: {
    finished: boolean
  }

  constructor(props: Props) {
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