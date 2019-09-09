class PismoClient {
  constructor(hostname) {
    this._hostname = hostname;
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

  async _makeFetch(methodId, params) {
    return await fetch('http://' + this._hostname + '/api', {
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