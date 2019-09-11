import React, { ReactNode } from 'react';
import './DataGrid.css';

interface Props {
  rows: Array<Array<ReactNode>>;
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