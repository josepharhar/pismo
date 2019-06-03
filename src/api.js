const http = require('http');

const pismoutil = require('./pismoutil.js');
const {logInfo, logError} = pismoutil.getLogger(__filename);

/**
 * @template RequestType,ResponseType
 */
exports.Method = class {
  /**
   * @param {string} id 
   * @param {pismoutil.JsonSchema} requestSchema
   * @param {pismoutil.JsonSchema} responseSchema
   */
  constructor(id, requestSchema, responseSchema) {
    this._id = id;
    this._requestSchema = requestSchema;
    this._responseSchema = responseSchema;
  }

  /**
   * @return {string}
   */
  id() {
    return this._id;
  }

  /**
   * @param {*} paramsObj
   * @return {!RequestType}
   */
  parseRequest(paramsObj) {
    return /** @type {!RequestType} */ pismoutil.parseJson(paramsObj, this._schema);
  }

  /**
   * @param {*} responseObj 
   * @return {!ResponseType}
   */
  parseResponse(responseObj) {
    return /** @type {!ResponseType} */ pismoutil.parseJson(responseObj, this._responseSchema);
  }

  /**
   * @template T
   * @param {string} method
   * @param {!Object} params
   * @return {!Promise<T>}
   */
  async fetchResponse(method, params) {
    const url = new URL(this.url());
    const requestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: '/api',
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      }
    };
    const postObj = {
      method: method,
      params: params
    };

    return new Promise(async (resolve, reject) => {
      const res = await new Promise((resolve, reject) => {
        const req = http.request(this.url(), requestOptions, resolve);
        req.on('error', error => {
          logError(`http.request() error`);
          reject(error);
        });
        req.write(JSON.stringify(postObj, null, 2));
        req.end();
      });

      let responseString = '';
      res.on('error', error => {
        logError(`error reading http response`);
        reject(error);
      });
      res.on('data', data => {
        responseString += data;
      });
      res.on('end', () => {
        resolve(responseString ? JSON.parse(responseString) : null);
      });
    });
  }
}
const Method = exports.Method;

/** @typedef {!{treeName: string}} GetTreeParams */
/** @typedef {!pismoutil.TreeFile} GetTreeResponse */
/** @type {!Method<GetTreeParams, GetTreeResponse>} */
exports.GetTree = new Method(
  'get-tree',
  {
    treeName: 'string'
  });

/** @typedef {!{treename: string, relativePath: string}} GetFileTimeParams */
/** @typedef {!{mtimeS: number, mtimeNs: number}} GetFileTimeResponse */
/** @type {!Method<GetFileTimeParams, GetFileTimeResponse>} */
exports.GetFileTime = new Method(
  'get-file-time',
  {
    treename: 'string',
    relativePath: 'string'
  });

/**
 * @typedef {!{
 *   treename: string,
 *   relativePath: string,
 *   mtimeS: number,
 *   mtimeNs: number
 * }} SetFileTimeParams
 */
/** @typedef {*} SetFileTimeResponse */
/** @type {!Method<SetFileTimeParams, SetFileTimeResponse>} */
exports.SetFileTime = new Method(
  'set-file-time',
  {
    treename: 'string',
    relativePath: 'string',
    mtimeS: 'number',
    mtimeNs: 'number'
  });