import * as http from 'http';
import * as stream from 'stream';
import {URL} from 'url';

import {Remote} from './remote.js';
import * as pismoutil from './pismoutil.js';
const {logInfo, logError} = pismoutil.getLogger(__filename);

/**
 * @template RequestType,ResponseType
 */
export class Method {
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

/**
 * @template RequestType,ResponseType
 * @extends {Method<RequestType, ResponseType>}
 */
export class StreamingMethod extends Method {
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

export const PUT_ID_HEADER_NAME = 'x-pismo-put-id';
/**
 * @template ResponseType
 */
export class UploadMethod {
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
    headers[PUT_ID_HEADER_NAME] = putId;
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

// Method instances

/** @typedef {!{includeRemotes: boolean}} GetTreesRequest */
/** @typedef {!{trees: !Array<!{treename: string, treefile: !pismoutil.TreeFile}>}} GetTreesResponse */
/** @type {!Method<GetTreesRequest, GetTreesResponse>} */
export const GetTrees = new Method(
  'get-trees',
  {
    includeRemotes: 'boolean'
  },
  {
    trees: [{
      treename: 'string',
      treefile: pismoutil.TreeFileSchema
    }]
  }
);

/** @typedef {!{remotes: !Array<!{name: string, url: string}>}} GetRemotesResponse */
/** @type {!Method<void, GetRemotesResponse>} */
export const GetRemotes = new Method(
  'get-remotes',
  {},
  {
    remotes: [{
      name: 'string',
      url: 'string'
    }]
  }
)

///** @typedef {!{treenames: !Array<string>}} ListTreesResponse */
///** @type {!Method<void, ListTreesResponse>} */
//export const ListTrees = new Method(
//  'list-trees',
//  null,
//  {
//    treenames: ['string']
//  });
//
///** @typedef {!{treeName: string}} GetTreeParams */
///** @typedef {!pismoutil.TreeFile} GetTreeResponse */
///** @type {!Method<GetTreeParams, GetTreeResponse>} */
//export const GetTree = new Method(
//  'get-tree',
//  {
//    treeName: 'string'
//  },
//  pismoutil.TreeFileSchema);

/** @typedef {!{treename: string, relativePath: string}} GetFileTimeParams */
/** @typedef {!{mtimeS: number, mtimeNs: number}} GetFileTimeResponse */
/** @type {!Method<GetFileTimeParams, GetFileTimeResponse>} */
export const GetFileTime = new Method(
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
export const SetFileTime = new Method(
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
export const GetFile = new StreamingMethod(
  'get-file',
  {
    treename: 'string',
    relativePath: 'string'
  });

/** @typedef {!{treename: string, relativePath: string, filesize: number}} PreparePutFileParams */
/** @typedef {!{putId: string}} PreparePutFileResponse */
/** @type {!Method<PreparePutFileParams, PreparePutFileResponse>} */
export const PreparePutFile = new Method(
  'prepare-put-file',
  {
    treename: 'string',
    relativePath: 'string',
    filesize: 'number'
  },
  {
    putId: 'string'
  });

export const PutFile = new UploadMethod();

/**
 * @typedef {!{
 *   srcTreename: string,
 *   srcRelativePath: string,
 *   destTreename: string,
 *   destRelativePath: string
 * }} CopyWithinParams
 */
/** @type {!Method<CopyWithinParams, void>} */
export const CopyWithin = new Method(
  'copy-within',
  {
    srcTreename: 'string',
    srcRelativePath: 'string',
    destTreename: 'string',
    destRelativePath: 'string'
  });

/** @type {!Method<CopyWithinParams, void>} */
export const MoveWithin = new Method(
  'move-within',
  {
    srcTreename: 'string',
    srcRelativePath: 'string',
    destTreename: 'string',
    destRelativePath: 'string'
  }
);

/** @typedef {!{treename: string, relativePath: string}} DeleteFileParams */
/** @type {!Method<DeleteFileParams, void>} */
export const DeleteFile = new Method(
  'delete-file',
  {
    treename: 'string',
    relativePath: 'string'
  });