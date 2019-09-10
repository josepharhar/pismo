import React from 'react';

interface Props {
  rows: Array<Array<Element>>;
}

class DataGrid extends React.Component<Props> {
  render() {
    return (
      <div className="datagrid">
        {this.props.rows.map(row => {
          return (
            <div className="datagrid-row">
              {row.map(cell => {
                return (
                  <div className="datagrid-cell">{cell}</div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }
}

export default DataGrid;