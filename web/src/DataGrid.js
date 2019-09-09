import React from 'react';

class DataGrid extends React.Component {
  /**
   * @param {!Array<!Array<!Element>>} rows 
   */
  constructor(rows) {
    super();
    this.rows = rows;
  }

  render() {
    return (
      <div className="datagrid">
        {this.rows.map(row => {
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