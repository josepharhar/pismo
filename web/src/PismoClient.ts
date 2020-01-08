import * as types from './PismoTypes';

class PismoClient {
  hostname: string;
  constructor(hostname: string) {
    this.hostname = hostname;
  }

  async getTrees(): Promise<types.GetTreesResponse> {
    const response = await this._makeFetch<types.GetTreesRequest>('get-trees', {includeRemotes: true});
    return await response.json();
  }

  async getRemotes(): Promise<types.GetRemotesResponse> {
    const response = await this._makeFetch(types.GetRemotes, {});
    return await response.json();
  }

  async deleteTree(treename: string) {
    const response = await this._makeFetch<types.DeleteTreeRequest>(types.DeleteTree, {treename});
    return await response.json();
  }

  async updateTree(treename: string) {
    const response = await this._makeFetch<types.UpdateTreeRequest>(types.UpdateTree, {treename});
    return await response.json();
  }

  async _makeFetch<T extends types.Request>(methodId: string, params: T) {
    return await fetch('http://' + this.hostname + '/api', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        method: methodId,
        params
      })
    });
  }
}

export default PismoClient;