const path = require('path');
const fs = require('fs');
const stream = require('stream');

const express = require('express');
const bodyParser = require('body-parser');
const progress = require('progress-stream');
// @ts-ignore
const nanostat = require('nanostat');
// @ts-ignore
const nanoutimes = require('nanoutimes');

const api = require('./api.js');
const pismoutil = require('./pismoutil.js');
const {logInfo, logError} = pismoutil.getLogger(__filename);

/**
 * @param {!express.Response} res
 * @param {!Error} error
 */
function respondWithError(res, error) {
  res.writeHead(500, {'content-type': 'text/plain'});
  res.end(error);
}

/** @typedef {!Object<string, !pismoutil.TreeFile>} ListResponse */
/**
 * @param {!Object} params
 * @return {!Promise<!Object>}
 */
async function handleList(params) {
  const treeNamesToPaths = await pismoutil.getTreeNamesToPaths();

  /** @type {!ListResponse} */
  const retval = {};

  for (const name in treeNamesToPaths) {
    /** @type {!pismoutil.TreeFile} */
    const tree = await pismoutil.readFileToJson(
      treeNamesToPaths[name]);
    if (tree === null) {
      logError('Failed to read tree json file for name: ' + name);
      continue;
    }

    retval[name] = tree;
  }
  return retval;
}

/**
 * @param {!Object} paramsObj
 * @return {!Promise<!api.GetTreeResponse>}
 */
async function handleGetTree(paramsObj) {
  /** @type {!api.GetTreeParams} */
  const request = api.GetTree.parseRequest(paramsObj);
  return await pismoutil.readTreeByName(request.treeName);
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
 * @param {import('yargs').Arguments} argv
 */
exports.server = async function(argv) {
  const port = argv.port;
  logInfo(`Running server on port ${port}`);

  const app = express();
  //app.use(express.json());
  //app.use(express.urlencoded());
  app.use(bodyParser.urlencoded({extended: false}));
  app.use(bodyParser.json());

  app.get('/', (req, res) => {
    res.send('Hello world');
  });

  // TODO why doesnt this work with get?
  app.post('/api', async (req, res) => {
    console.log(`${req.statusCode} ${req.url} ${JSON.stringify(req.headers, null, 2)}`);
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

    const method = req.body.method;
    const params = req.body.params;
    async function dispatchToHandler() {
      switch (method) {
        case 'list':
          return await handleList(params);
        case api.GetTree.id():
          return await handleGetTree(params);
        case api.GetFileTime.id():
          return await handleGetFileTime(params);
        case api.SetFileTime.id():
          return await handleSetFileTime(params);
        default:
          throw new Error('unrecognized request method: ' + method);
      }
    }

    let retObj = null;
    try {
      retObj = await dispatchToHandler();
    } catch (error) {
      respondWithError(res, error);
      return;
    }
    res.writeHead(200, {'content-type': 'application/json'});
    if (retObj) {
      res.write(JSON.stringify(retObj, null, 2));
    }
    res.end();
  });

  app.listen(port);

  async function writeStreamToFile(stream, filename) {
    fs.createWriteStream(filename);
    return new Promise((resolve, reject) => {
    });
  }
  app.post('/fileupload', async (req, res) => {
    console.log(`${req.method} ${req.url} ${JSON.stringify(req.headers, null, 2)}`);
    const length = Number(req.headers['x-pismo-length']);
    if (length === NaN) {
      // TODO
      console.log('invalid x-pismo-length header: ' + req.headers['x-pismo-length']);
    }
    const fileWriteStream = fs.createWriteStream('output.o');

    const progressStream = progress({
      length: length,
      time: 1000 /* ms */
    }, progress => {
      console.log('progress: ' + JSON.stringify(progress));
    });

    // TODO should i be doing this?
    res.end('hello from server');

    req.pipe(progressStream).pipe(fileWriteStream);
    //req.pipe(fileWriteStream);
    //await streamPrint(req);
  });
}

async function streamPrint(stream) {
  return new Promise((resolve, reject) => {
    stream.on('data', chunk => {
      console.log('data: ' + chunk);
    });
    stream.on('error', reject);
    stream.on('end', resolve);
  });
}

async function streamToString(stream) {
  return new Promise((resolve, reject) => {
    let chunks = '';
    stream.on('data', chunk => {
      chunks += chunk;
    });
    stream.on('error', reject);
    stream.on('end', () => resolve(chunks));
  });
}
