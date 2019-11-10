import React, { RefObject } from 'react';
import './ServerPicker.css';

interface Props {
  onServerPicked: (serverAddress: string) => void;
}

interface Server {
  name: string;
  address: string;
}

const localStorageKey = 'pismo-server-picker-servers';

function getServersListFromLocalStorage(): Array<Server> {
  const serversString = window.localStorage.getItem(localStorageKey);
  if (!serversString) {
    return [];
  }
  return JSON.parse(serversString);
}

interface ServerState {
  name: string;
  address: string;
  status?: string;
}

interface ServerPickerState {
  serversList: Array<ServerState>;
}

class ServerPicker extends React.Component<Props, ServerPickerState> {
  serverNameInput: RefObject<HTMLInputElement>;
  serverAddressInput: RefObject<HTMLInputElement>;

  constructor(props: Props) {
    super(props);
    this.state = {
      serversList: []
    };

    this.serverNameInput = React.createRef();
    this.serverAddressInput = React.createRef();
  }

  async checkServerStatus(serverState: ServerState) {
    const setStatus = (status: string) => {
      serverState.status = status;
      this.setState(this.state);
    };

    setStatus('pinging...');

    const url = `http://${serverState.address}/version`;
    let fetchResponse = null;
    try {
      fetchResponse = await fetch(url);
    } catch (error) {
      setStatus('offline: ' + error);
      return;
    }

    if (!fetchResponse.ok) {
      setStatus('offline: !fetchResponse.ok');
      return;
    }

    setStatus('online!');
  }

  updateStateFromLocalStorage() {
    const newServers = getServersListFromLocalStorage();
    for (const newServer of newServers) {
      const shouldAdd = () => {
        for (const oldServer of this.state.serversList) {
          if (oldServer.name === newServer.name && oldServer.address === newServer.address) {
            return false;
          }
        }
        return true;
      };
      if (shouldAdd()) {
        this.state.serversList.push(newServer);
        this.checkServerStatus(newServer);
      }
    }
    this.setState(this.state);
  }

  storageEventListener(storageEvent: StorageEvent) {
    if (storageEvent.key === localStorageKey)
      this.updateStateFromLocalStorage();
  }

  componentDidMount() {
    window.addEventListener('storage', this.storageEventListener);
    this.updateStateFromLocalStorage();
  }
  componentWillUnmount() {
    window.removeEventListener('storage', this.storageEventListener);
  }

  addServer(server: Server) {
    this.state.serversList.push(server);
    window.localStorage.setItem(localStorageKey, JSON.stringify(this.state.serversList));
    this.checkServerStatus(server);
  }

  removeServer(server: Server) {
    const index = this.state.serversList.indexOf(server);
    if (index > -1)
      this.state.serversList.splice(index, 1);
    window.localStorage.setItem(localStorageKey, JSON.stringify(this.state.serversList));
    this.setState(this.state);
  }

  render() {
    return (
      <div className='serverpicker'>
        <div style={{display: 'block', border: '1px solid black'}}>
          Add a server:
          <div>
            <label>
              Server Name (optional)
              <input ref={this.serverNameInput}></input>
            </label>
          </div>
          <div>
            <label>
              Server Address
              <input ref={this.serverAddressInput}></input>
            </label>
          </div>
          <button onClick={() => {
            const newServer = {
              name: this.serverNameInput.current ? this.serverNameInput.current.value : '',
              address: this.serverAddressInput.current ? this.serverAddressInput.current.value : ''
            };
            this.addServer(newServer);
          }}>
            Add
          </button>
        </div>

        <div>
          {this.state.serversList.map(server => {
            return (
              <div style={{border: '1px solid'}} key={`${server.name}-${server.address}`}>
                <div style={{cursor: 'pointer'}}
                    onClick={() => this.props.onServerPicked(server.address)}>
                  {server.name ? <div>name: {server.name}</div> : ''}
                  <div>address: {server.address}</div>
                  <div>status: {server.status}</div>
                </div>
                <button onClick={() => {
                  this.removeServer(server);
                }}>
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}

export default ServerPicker;