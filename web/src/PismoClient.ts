class PismoClient {
  hostname: string;
  constructor(hostname: string) {
    this.hostname = hostname;
  }

  async getTrees() {
    //return (await this._makeFetch('get-trees', {})).json();
    const response = await this._makeFetch('get-trees', {includeRemotes: true});
    /*window.response = response;
    console.log('response: ', response);*/
    /*const text = await response.text();
    console.log('response: ' + text);
    return JSON.parse(text);*/
    return await response.json();
  }

  async _makeFetch(methodId: string, params: object) {
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