import React from 'react';

interface Props {
  initialValue: string;
  onRename: Function;
}


export class Renamer extends React.Component<Props> {

  valueText: React.Ref<HTMLSpanElement>;

  constructor(props: Props) {
    super(props);

    this.valueText = React.createRef();
  }

  render() {
    return (
      <div>
        <button onClick={() => {
          this.props.onRename()
        }}>
          rename
        </button>
        <span contentEditable ref={this.valueText}>
          {this.props.initialValue}
        </span>
      </div>
    );
  }
}