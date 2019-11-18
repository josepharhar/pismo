import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';

const pismoVersionKey = 'pismoversion';
const pismoVersion = window.localStorage.getItem(pismoVersionKey);
if (!pismoVersion) {
  window.localStorage.setItem(pismoVersionKey, '0.0.1');
}

ReactDOM.render(<App />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
