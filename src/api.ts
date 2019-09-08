const http = require('http');
const stream = require('stream');
const {URL} = require('url');

const {Remote} = require('./remote');
const pismoutil = require('./pismoutil.js');
const {logInfo, logError} = pismoutil.getLogger(__filename);

const protocol = require('./gen/pismoRemoteProtocol.js');

/**
 * @template RequestType,ResponseType
 */
exports.Method = class {
  /**
   * @param {!protocol.PismoMethod} protocolMethod
   */
  constructor(protocolMethod) {
    this._id = protocolMethod.id;
    this._requestSchema = protocolMethod.requestSchema;
    this._responseSchema = protocolMethod.responseSchema;
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

    const res = await new Promise((resolve, reject) => {
      const req = http.request(remote.url(), requestOptions, resolve);
      req.on('error', error => {
        logError(`http.request() error. url: ${url}`);
        reject(error);
      })
      req.write(JSON.stringify(postObj, null, 2));
      req.end();
    });

    if (Math.floor(res.statusCode / 100) !== 2) {
      throw new Error('got bad status code: ' + res.statusCode
        + '\nheaders: ' + JSON.stringify(res.headers, null, 2)
        + '\nbody:\n' + await pismoutil.streamToString(res));
    }

    return res;
  }

  /**
   * @param {!Remote} remote
   * @param {!RequestType} params
   * @return {!Promise<!ResponseType>}
   */
  async fetchResponse(remote, params) {
    const res = await this._getResponse(remote, params);
    const responseString = await pismoutil.streamToString(res);
    if (!responseString)
      return null;
    const obj = JSON.parse(responseString);
    pismoutil.parseJson(obj, this._responseSchema);
    return /** @type {!ResponseType} */ (obj);
  }
}
const Method = exports.Method;

/**
 * @template RequestType,ResponseType
 * @extends {Method<RequestType, ResponseType>}
 */
class StreamingMethod extends Method {
  /**
   * @param {!protocol.PismoMethod} protocolMethod
   */
  constructor(protocolMethod) {
    super(protocolMethod);
  }

  /**
   * TODO make a separate interface so i don't have to do this?
   * @override
   * @param {!Remote} remote
   * @param {!RequestType} params
   * @return {!Promise<!ResponseType>}
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
   * @param {number} contentLength
   * @return {!Promise<!ResponseType>}
   */
  async upload(remote, putId, readableStream, contentLength) {
    const url = new URL(remote.url());
    /** @type {!http.OutgoingHttpHeaders} */
    const headers = {};
    headers['content-length'] = contentLength;
    headers['content-type'] = 'application/octet-stream';
    headers[exports.PUT_ID_HEADER_NAME] = putId;
    const requestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: '/upload',
      method: 'PUT',
      headers: headers
    };

    const res = await new Promise((resolve, reject) => {
      // TODO do i need to have the remote.url() parameter?
      const req = http.request(remote.url(), requestOptions, resolve);
      req.on('error', error => {
        reject(new pismoutil.ErrorWrapper(error, `http.request() UploadMethod request error. url: ${url}`));
      })
      readableStream
        .on('error', error => {
          reject(new pismoutil.ErrorWrapper(error, `failed to read from readable stream to post to request. url: ${url}`));
        })
        .pipe(req);
    });
    if (Math.floor(res.statusCode / 100) !== 2) { // TODO this check should only appear once in code
      throw new Error('got bad status code: ' + res.statusCode
        + '\nrequest url: ' + remote.url()
        + '\nrequestOptions: ' + JSON.stringify(requestOptions, null, 2)
        + '\nheaders: ' + JSON.stringify(res.headers, null, 2)
        + '\nbody: ' + await pismoutil.streamToString(res));
    }

    // TODO use a response schema here!
    const responseString = await pismoutil.streamToString(res);
    return JSON.parse(responseString);
  }

};
exports.UploadMethod = UploadMethod;

// Method instances

/** @type {!Method<void, protocol.GetTreesResponse>} */
exports.GetTrees = new Method(protocol.GetTrees);

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

/** @type {!Method<protocol.GetFileTimeParams, protocol.GetFileTimeResponse>} */
exports.GetFileTime = new Method(protocol.GetFileTime);

/** @type {!Method<protocol.SetFileTimeParams, protocol.SetFileTimeResponse>} */
exports.SetFileTime = new Method(protocol.SetFileTime);

/** @type {!StreamingMethod<protocol.GetFileParams, void>} */
exports.GetFile = new StreamingMethod(protocol.GetFile);

/** @type {!Method<protocol.PreparePutFileParams, protocol.PreparePutFileResponse>} */
exports.PreparePutFile = new Method(protocol.PreparePutFile);

exports.PutFile = new UploadMethod();

/** @type {!Method<protocol.CopyWithinParams, void>} */
exports.CopyWithin = new Method(protocol.CopyWithin);

/** @type {!Method<protocol.DeleteFileParams, void>} */
exports.DeleteFile = new Method(protocol.DeleteFile);

export {};
