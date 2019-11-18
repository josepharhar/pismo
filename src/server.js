import * as path from 'path';
import * as fs from 'fs';
import * as stream from 'stream';
import * as crypto from 'crypto';
import * as http from 'http';

import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as progress from 'progress-stream';
import * as mkdirp from 'mkdirp';
import * as cors from 'cors';
// @ts-ignore
// @ts-ignore
// @ts-ignore
import * as nanostat from 'nanostat';
// @ts-ignore
// @ts-ignore
// @ts-ignore
import * as nanoutimes from 'nanoutimes';
import * as send from 'send';

import * as api from './api.js';
import * as remote from './remote.js';
import * as pismoutil from './pismoutil.js';
import * as apply from './apply.js';
const {logInfo, logError} = pismoutil.getLogger(__filename);

/**
 * @param {!Object} params
 * @return {!Promise<!api.GetTreesResponse>}
 */
async function handleGetTrees(params) {
  const request = api.GetTrees.parseRequest(params);

  const treeNamesToPaths = await pismoutil.getTreeNamesToPaths();

  /** @type {!api.GetTreesResponse} */
  const response = {
    trees: []
  };

  for (const name in treeNamesToPaths) {
    /** @type {!pismoutil.TreeFile} */
    const treefile = await pismoutil.readFileToJson(
      treeNamesToPaths[name]);
    if (!treefile) {
      logError(`Failed to read tree json file for name: ${name}`);
      continue;
    }
    response.trees.push({
      treename: name,
      treefile: treefile
    });
  }

  if (request.includeRemotes) {
    // TODO reduce duplication with list.js
    const remotes = await remote.Remote.getAllRemotes();
    for (const remote of remotes) {
      // TODO is this how this should be used...?
      await remote.readFromFile();
      const remoteTreeNamesToPaths = await remote.getTreeNamesToPaths();
      for (const name in remoteTreeNamesToPaths) {
        const treefile = await pismoutil.readFileToJson(
          remoteTreeNamesToPaths[name]);
        response.trees.push({
          treename: `${remote.name()}/${name}`,
          treefile
        });
      }
    }
  }

  return response;
}

/**
 * @param {!Object} paramsObj
 * @return {!Promise<!api.GetFileTimeResponse>}
 */
async function handleGetFileTime(paramsObj) {
  const request = api.GetFileTime.parseRequest(paramsObj);

  // TODO use a caching layer like remotes for this
  const treeFile = await pismoutil.readTreeByName(request.treename);
  const absolutePath = path.join(treeFile.path, request.relativePath);

  /** @type {!pismoutil.Stats} */
  const stats = pismoutil.stat(absolutePath);
  /** @type {!GetFileTimeResponse} */
  return {
    mtimeS: Number(stats.mtimeMs / 1000n),
    mtimeNs: Number(stats.mtimeNs)
  };
}

/**
 * @param {!Object} paramsObj
 * @return {!Promise<!api.SetFileTimeResponse>}
 */
async function handleSetFileTime(paramsObj) {
  const request = api.SetFileTime.parseRequest(paramsObj);

  // TODO use a caching layer like remotes for this
  const treeFile = await pismoutil.readTreeByName(request.treename);
  const absolutePath = path.join(treeFile.path, request.relativePath);

  nanoutimes.utimesSync(absolutePath, null, null, request.mtimeS, request.mtimeNs);
}

/**
 * @param {!Object} paramsObj 
 * @return {!Promise<stream.Readable>}
 */
async function handleGetFile(paramsObj) {
  const request = api.GetFile.parseRequest(paramsObj);

  const treeFile = await pismoutil.readTreeByName(request.treename);
  const absolutePath = path.join(treeFile.path, request.relativePath);

  return fs.createReadStream(absolutePath);
}

/**
 * @param {!Object} paramsObj 
 * @param {!http.IncomingMessage} req
 * @param {!http.ServerResponse} res
 */
async function handleGetFileWeb(paramsObj, req, res) {
  const request = api.GetFileWeb.parseRequest(paramsObj);
  const treeFile = await pismoutil.readTreeByName(request.treename);
  const absolutePath = path.join(treeFile.path, request.relativePath);

  return new Promise((resolve, reject) => {
    send(req, absolutePath, res);
  });
}

/** @type {!Map<string, !{treename: string, relativePath: string, filesize: number}>} */
const _putIdToTreeAndPath = new Map();
/**
 * @param {!Object} paramsObj
 * @return {!Promise<!api.PreparePutFileResponse>}
 */
async function handlePreparePutFile(paramsObj) {
  const {treename, relativePath, filesize} = api.PreparePutFile.parseRequest(paramsObj);

  function generatePutId() {
    return crypto.randomBytes(20).toString('hex');
  }
  let newPutId = generatePutId();
  while (_putIdToTreeAndPath.has(newPutId))
    newPutId = generatePutId();

  _putIdToTreeAndPath.set(newPutId, {
    treename: treename,
    relativePath: relativePath,
    filesize: filesize
  });

  return {
    putId: newPutId
  };
}

/**
 * @param {!Object} paramsObj 
 */
async function handleDeleteFile(paramsObj) {
  const request = api.DeleteFile.parseRequest(paramsObj);

  const treeFile = await pismoutil.readTreeByName(request.treename);
  const absolutePath = path.join(treeFile.path, request.relativePath);
  await new Promise((resolve, reject) => {
    fs.unlink(absolutePath, error => {
      if (error)
        reject(error)
      else
        resolve();
    });
  })
}

/**
 * @param {!Object} paramsObj 
 * @param {'cp'|'mv'} copyOrMove 
 */
async function handleCopyWithin(paramsObj, copyOrMove) {
  const request = api.CopyWithin.parseRequest(paramsObj);

  const srcTreeFile = await pismoutil.readTreeByName(request.srcTreename);
  const srcAbsolutePath = path.join(srcTreeFile.path, request.srcRelativePath);
  const destTreeFile = await pismoutil.readTreeByName(request.destTreename);
  const destAbsolutePath = path.join(destTreeFile.path, request.destRelativePath);

  await new Promise((resolve, reject) => {
    mkdirp(path.dirname(destAbsolutePath), error => {
      if (error)
        reject(error);
      else
        resolve();
    });
  });

  await new Promise((resolve, reject) => {
    const handler = error => {
      if (error)
        reject(error);
      else
        resolve();
    };
    if (copyOrMove === 'cp')
      fs.copyFile(srcAbsolutePath, destAbsolutePath, handler);
    else if (copyOrMove === 'mv')
      fs.rename(srcAbsolutePath, destAbsolutePath, handler);
  })
}

/**
 * TODO TODO TODO make this update the local file during this
 * i have the problem where id update a file with the same modified time
 * and then it doesnt propogate
 * @param {!express.Request} req 
 * @param {!express.Response} res 
 */
async function handleUpload(req, res) {
  const putId = req.headers[api.PUT_ID_HEADER_NAME];
  if (typeof(putId) !== 'string' || !_putIdToTreeAndPath.has(putId)) {
    res.writeHead(400, {'content-type': 'text/plain'});
    res.end(typeof(putId) === 'string'
      ? 'provided putId not in _putIdToTreeAndPath'
      : `'${api.PUT_ID_HEADER_NAME}' header missing or invalid. headers: ${JSON.stringify(req.headers, null, 2)}`);
    return;
  }
  const {treename, relativePath, filesize} = _putIdToTreeAndPath.get(putId);
  _putIdToTreeAndPath.delete(putId);
  const treefile = await pismoutil.readTreeByName(treename);
  const absolutePath = path.join(treefile.path, relativePath);
  await new Promise(resolve => {
    // @ts-ignore
    // @ts-ignore
    mkdirp(path.dirname(absolutePath), error => {
      resolve();
    });
  });
  const fileWriteStream = fs.createWriteStream(absolutePath);

  req.on('error', error => {
    if (!res.headersSent) {
      res.writeHead(500, {'content-type': 'text/plain'});
      res.end('req read error: ' + error);
    }
  })
  fileWriteStream.on('error', error => {
    if (!res.headersSent) {
      res.writeHead(500, {'content-type': 'text/plain'});
      res.end('fileWriteStream error: ' + error);
    }
  });
  fileWriteStream.on('finish', () => {
    if (!res.headersSent) {
      res.writeHead(200, {'content-type': 'application/json'});
      res.end(JSON.stringify({message: 'successful upload to handleUpload'}));
    }
  });

  const progressStream = progress({
      length: filesize,
      time: 1000 /* ms interval to print updates */
    }, progress => {
      console.log('progress: ' + JSON.stringify(progress));
  });

  req.pipe(progressStream).pipe(fileWriteStream);
}

/**
 * @param {import('./pismo.js').ServerArgs} argv
 */
export async function server(argv) {
  const port = argv.port;
  logInfo(`Running server on port ${port}`);

  const app = express();

  // @ts-ignore
  // @ts-ignore
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });

  app.use(cors());

  /*app.get('/', (req, res) => {
    res.redirect('/web');
  });
  app.use(express.static('static'));*/

  // TODO why doesnt this work with get?
  app.post('/api', bodyParser.json());
  app.post('/api', async (req, res) => {
    if (!req.body) {
      res.writeHead(500, {'content-type': 'text/plain'});
      res.end('!req.body');
      return;
    }

    // req.body will be {} if the request was malformed:
    //   no body, non-json body, or wrong content-type
    //   TODO or if its a GET too???
    if (Object.entries(req.body).length === 0) {
      res.writeHead(400, {'content-type': 'text/plain'});
      res.end('req.body: ' + JSON.stringify(req.body));
      return;
    }

    let customHandler = false;
    /** @type {?stream.Readable} */
    let readableStreamResponse = null;
    const method = req.body.method;
    const params = req.body.params;
    async function dispatchToHandler() {
      //console.log('dispatchToHandler method: ' + method);
      switch (method) {
        case api.GetTrees.id():
          return await handleGetTrees(params);
        case api.GetFileTime.id():
          return await handleGetFileTime(params);
        case api.SetFileTime.id():
          return await handleSetFileTime(params);
        case api.GetFile.id():
          readableStreamResponse = await handleGetFile(params);
          return null;
        case api.GetFileWeb.id():
          customHandler = true;
          await handleGetFileWeb(params, req, res);
          return null;
        case api.PreparePutFile.id():
          return await handlePreparePutFile(params);
        case api.DeleteFile.id():
          return await handleDeleteFile(params);
        case api.CopyWithin.id():
          return await handleCopyWithin(params, 'cp');
        case api.MoveWithin.id():
          return await handleCopyWithin(params, 'mv');
        default:
          throw new Error('unrecognized request method: ' + method);
      }
    }

    let retObj = null;
    try {
      retObj = await dispatchToHandler();
    } catch (error) {
      console.log('got error from dispatchToHandler()');
      //res.writeHead(500, {'content-type': 'text/plain'});
      res.status(500);
      let output = '';
      if (error.wrappedMessage)
        output += error.wrappedMessage + '\n';
      output += error.stack;
      res.send(output); // .send() internally calls res.end()
      //res.send(error.stack); // .send() internally calls res.end()
      return;
    }

    if (customHandler) {
      return;
    }

    if (readableStreamResponse) {
      res.writeHead(200, {'content-type': 'application/octet-stream'});
      await new Promise((resolve, reject) => {
        readableStreamResponse.on('finish', resolve);
        readableStreamResponse.on('error', reject);
        readableStreamResponse.pipe(res);
      });
      return;
    }

    if (retObj) {
      res.writeHead(200, {'content-type': 'application/json'});
      res.write(JSON.stringify(retObj, null, 2));
    } else {
      res.writeHead(200);
    }
    res.end();
  });

  app.put('/upload', async (req, res) => {
    try {
      await handleUpload(req, res);
    } catch (error) {
      res.writeHead(500, {'content-type': 'text/plain'});
      res.end('handleUpload failed with error:' + error.stack);
    }
  });

  // @ts-ignore
  app.get('/version', async (req, res) => {
    res.writeHead(200, {'content-type': 'text/plain'});
    res.end('TODO add versioning here');
  });

  app.use('/apply', async (req, res) => {
    // @ts-ignore
    if (global.__apply_in_progress) {
      const errorString = 'cannot apply while another apply is in progress!';
      res.writeHead(400, {'content-type': 'text/plain'});
      res.end(errorString);
      logError(errorString);
      return;
    }
    // @ts-ignore
    global.__apply_in_progress = true;

    const jsonString = await pismoutil.streamToString(req);
    let json = null;
    try {
      json = JSON.parse(jsonString);
    } catch (error) {
      const errorString = 'failed to parse json for /apply: ' + error;
      logError(errorString);
      res.writeHead(400, {'content-type': 'text/plain'});
      res.end(errorString);
      // @ts-ignore
      global.__apply_in_progress = false;
      return;
    }

    try {
      pismoutil.parseJson(json, pismoutil.MergeFileSchema);
    } catch (error) {
      const errorString = 'failed to verify json for /apply: ' + error;
      logError(errorString);
      res.writeHead(400, {'content-type': 'text/plain'});
      res.end(errorString);
      // @ts-ignore
      global.__apply_in_progress = false;
      return;
    }

    try {
      await apply.applyInternal(json);
    } catch (error) {
      const errorString = 'failed to apply.applyInternal for /apply: ' + error;
      logError(errorString);
      res.writeHead(400, {'content-type': 'text/plain'});
      res.end(errorString);
      // @ts-ignore
      global.__apply_in_progress = false;
      return;
    }

    logInfo('/apply finished');
    res.writeHead(200, {'content-type': 'text/plain'});
    res.end('hello from /apply');
    // @ts-ignore
    global.__apply_in_progress = false;
  });

  app.listen(port);
}