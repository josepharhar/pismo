const http = require('http');
const {URL} = require('url');

const {Remote} = require('remote');
const stream = require('stream');
const pismoutil = require('./pismoutil.js');
const {logInfo, logError} = pismoutil.getLogger(__filename);

/**
 * @template RequestType,ResponseType
 */
exports.Method = class {
  /**
   * @param {string} id 
   * @param {pismoutil.JsonSchema=} requestSchema
   * @param {pismoutil.JsonSchema=} responseSchema
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
    return /** @type {!RequestType} */ pismoutil.parseJson(paramsObj, this._requestSchema);
  }

  /**
   * @param {*} responseObj 
   * @return {!ResponseType}
   */
  parseResponse(responseObj) {
    return /** @type {!ResponseType} */ pismoutil.parseJson(responseObj, this._responseSchema);
  }

  /**
   * @param {!Remote} remote
   * @param {!RequestType} params
   */
  async _getResponse(remote, params) {
    const url = new URL(remote.url());
    const requestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: '/api',
      method: 'POST',
      headers: {
        'connection': 'keep-alive',
        'content-type': 'application/json'
      }
    };
    const postObj = {
      method: this._id,
      params: params
    };

    return await new Promise((resolve, reject) => {
      const req = http.request(remote.url(), requestOptions, resolve);
      req.on('error', error => {
        logError(`http.request() error. url: ${url}`);
        reject(error);
      })
      req.write(JSON.stringify(postObj, null, 2));
      req.end();
    });
  }

  /**
   * @template T
   * @param {!Remote} remote
   * @param {!Object} params
   * @return {!Promise<T>}
   */
  async fetchResponse(remote, params) {
    const res = await this._getResponse(remote, params);
    const responseString = await pismoutil.streamToString(res);
    if (responseString)
      return JSON.parse(responseString);
    return null;
  }
}
const Method = exports.Method;

/**
 * @template RequestType,ResponseType
 * @extends {Method<RequestType, ResponseType>}
 */
class StreamingMethod extends Method {
  /**
   * @param {string} id 
   * @param {pismoutil.JsonSchema=} requestSchema 
   * @param {pismoutil.JsonSchema=} responseSchema 
   */
  constructor(id, requestSchema, responseSchema) {
    super(id, requestSchema, responseSchema);
  }

  /**
   * TODO make a separate interface so i don't have to do this?
   * @override
   * @template T
   * @param {!Remote} remote
   * @param {!RequestType} params
   * @return {!Promise<T>}
   */
  async fetchResponse(remote, params) {
    throw new Error('StreamingMethod.fetchResponse - use StreamingMethod.streamResponse');
  }

  /**
   * @param {!Remote} remote
   * @param {!RequestType} params
   * @return {!Promise<!stream.Readable>}
   */
  async streamResponse(remote, params) {
    return await this._getResponse(remote, params);
  }
};
exports.StreamingMethod = StreamingMethod;

exports.PUT_ID_HEADER_NAME = 'x-pismo-put-id';
/**
 * @template ResponseType
 */
class UploadMethod {
  /**
   * @param {!Remote} remote 
   * @param {string} putId
   * @param {!stream.Readable} readableStream
   * @return {!Promise<!ResponseType>}
   */
  async upload(remote, putId, readableStream) {
    const url = new URL(remote.url());
    const putIdHeaderName = exports.PUT_ID_HEADER_NAME; // TODO why do i need this
    const requestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: '/upload',
      method: 'PUT',
      headers: {
        'connection': 'keep-alive',
        'content-type': 'application/octet-stream',
        putIdHeaderName: putId
      }
    }

    const res = await new Promise((resolve, reject) => {
      // TODO do i need to have the remote.url() parameter?
      const req = http.request(remote.url(), requestOptions, resolve);
      req.on('error', error => {
        reject(new pismoutil.ErrorWrapper(error, `http.request() UploadMethod request error. url: ${url}`));
      })
      readableStream
        .on('error', error => {
          reject(new pismoutil.ErrorWrapper(error, `http.request() upload stream failed. url: ${url}`));
        })
        .pipe(req);
    });

    const responseString = await pismoutil.streamToString(res);
    return JSON.parse(responseString);
  }

};
exports.UploadMethod = UploadMethod;

// Method instances

/** @typedef {!{trees: !Array<!{treename: string, treefile: !pismoutil.TreeFile}>}} GetTreesResponse */
/** @type {!Method<void, GetTreesResponse>} */
exports.GetTrees = new Method(
  'get-trees',
  null,
  {
    trees: [{
      treename: 'string',
      treefile: pismoutil.TreeFileSchema
    }]
  }
)

///** @typedef {!{treenames: !Array<string>}} ListTreesResponse */
///** @type {!Method<void, ListTreesResponse>} */
//exports.ListTrees = new Method(
//  'list-trees',
//  null,
//  {
//    treenames: ['string']
//  });
//
///** @typedef {!{treeName: string}} GetTreeParams */
///** @typedef {!pismoutil.TreeFile} GetTreeResponse */
///** @type {!Method<GetTreeParams, GetTreeResponse>} */
//exports.GetTree = new Method(
//  'get-tree',
//  {
//    treeName: 'string'
//  },
//  pismoutil.TreeFileSchema);

/** @typedef {!{treename: string, relativePath: string}} GetFileTimeParams */
/** @typedef {!{mtimeS: number, mtimeNs: number}} GetFileTimeResponse */
/** @type {!Method<GetFileTimeParams, GetFileTimeResponse>} */
exports.GetFileTime = new Method(
  'get-file-time',
  {
    treename: 'string',
    relativePath: 'string'
  },
  {
    mtimeS: 'number',
    mtimeNs: 'number'
  });

/**
 * @typedef {!{
 *   treename: string,
 *   relativePath: string,
 *   mtimeS: number,
 *   mtimeNs: number
 * }} SetFileTimeParams
 */
/** @typedef {void} SetFileTimeResponse */
/** @type {!Method<SetFileTimeParams, SetFileTimeResponse>} */
exports.SetFileTime = new Method(
  'set-file-time',
  {
    treename: 'string',
    relativePath: 'string',
    mtimeS: 'number',
    mtimeNs: 'number'
  },
  null);

/** @typedef {!{treename: string, relativePath: string}} GetFileParams */
/** @type {!StreamingMethod<GetFileParams, void>} */
exports.GetFile = new StreamingMethod(
  'get-file',
  {
    treename: 'string',
    relativePath: 'string'
  });

/** @typedef {!{treename: string, relativePath: string}} PreparePutFileParams */
/** @typedef {!{putId: string}} PreparePutFileResponse */
/** @type {!Method<PreparePutFileParams, PreparePutFileResponse>} */
exports.PreparePutFile = new Method(
  'prepare-put-file',
  {
    treename: 'string',
    relativePath: 'string'
    // TODO add file size?
  },
  {
    putId: 'string'
  });

exports.PutFile = new UploadMethod();

/**
 * @typedef {!{
 *   srcTreename: string,
 *   srcRelativePath: string,
 *   destTreename: string,
 *   destRelativePath: string
 * }} CopyWithinParams
 */
/** @type {!Method<CopyWithinParams, void>} */
exports.CopyWithin = new Method(
  'copy-within',
  {
    srcTreename: 'string',
    srcRelativePath: 'string',
    destTreename: 'string',
    destRelativePath: 'string'
  });

/** @typedef {!{treename: string, relativePath: string}} DeleteFileParams */
/** @type {!Method<DeleteFileParams, void} */
exports.DeleteFile = new Method(
  'delete-file',
  {
    treename: 'string',
    relativePath: 'string'
  });