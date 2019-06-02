const path = require('path');
const fs = require('fs');
const stream = require('stream');

const express = require('express');
const bodyParser = require('body-parser');
const progress = require('progress-stream');
const nanostat = require('nanostat');

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

/**
 * @param {!express.Response} res
 * @param {!Object} json
 */
function respondWithJson(res, json) {
  res.writeHead(200, {'content-type': 'application/json'});
  res.end(JSON.stringify(json));
}

/**
 * @param {!Object} params
 * @param {!express.Response} res
 */
async function handleList(params, res) {
  let treeNamesToPaths = null;
  try {
    treeNamesToPaths = await pismoutil.getTreeNamesToPaths();
  } catch (error) {
    respondWithError(res, error);
    return;
  }

  /** @type {!Object<string, !pismoutil.TreeFile>} */
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

    console.log(name);
    console.log('  path: ' + tree.path);
    console.log('  lastModified: ' + tree.lastModified);
  }

  respondWithJson(res, retval);
}

class Params {
  /**
   * @param {*} obj
   * @param {!Object<string, string>} fieldToType
   */
  constructor(obj, fieldToType) {
    // TODO add support for nested types within objects
    for (const field in fieldToType) {
      const type = fieldToType[field];

      const actualType = typeof(obj[field]);
      if (actualType !== type) {
        throw new Error(`Params constructor - expected field "${field}" to have type "${type}". was: ${actualType}. obj: ${JSON.stringify(obj, null, 2)}`);
      }

      this[field] = obj[field];
    }
  }
};

class ErrorWrapper extends Error {
  constructor(error, message) {
    super();
    this.name = 'ErrorWrapper';
    this.message = message + '\n' + error.message;
    this.stack = error.stack;
  }
};

/**
 * @param {string} absolutePath
 * TODO figure out return type
 */
function stat(absolutePath) {
  try {
    const stats = nanostat.statSync(absolutePath);
  } catch (error) {
    throw new ErrorWrapper(error, `Failed to nanostat.statSync path: "${absolutePath}"`);
  }
}

/**
 * @param {!Object} params
 * @param {!express.Response} res
 */
async function handleGetTree(params, res) {
  if (typeof(params.treeName) !== 'string') {
    respondWithError(res, new Error('invalid treeName parameter. found: ' + params.treeName));
    return;
  }

  let treeFile = null;
  try {
    treeFile = await pismoutil.readTreeByName(params.treeName);
  } catch (error) {
    respondWithError(res, error);
    return;
  }

  respondWithJson(res, treeFile);
}

/** @type {!{treename: string, relativePath: string}} GetFileTimeParams */
/** @type {!{mtimeS: number, mtimeNs: number}} GetFileTimeResponse */
/**
 * @param {!Object} paramsObj
 * @param {!express.Response} res
 */
async function handleGetFileTime(paramsObj, res) {
  /** @type {!GetFileTimeParams} */
  const params = new Params(paramsObj, {
    treename: 'string',
    relativePath: 'string'
  });

  // TODO use a caching layer like remotes for this
  const treeFile = await pismoutil.readTreeByName(params.treeName);
  const absolutePath = path.join(treeFile.path, params.relativePath);

  const stats = stat(absolutePath);
  respondWithJson({
    mtimeS: Number(stats.mtimeMs / 1000n),
    mtimeNs: Number(stats.mtimeNs)
  });
}

/**
 * @param {!Object} params
 * @param {!express.Response} res
 */
async function handleSetFileTime(params, res) {
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

    const params = req.body.params;
    try {
      switch (req.body.method) {
        case 'list':
          await handleList(params, res);
          break;

        case 'get-tree':
          await handleGetTree(params, res);
          break;
        
        case 'get-file-time':
          await handleGetFileTime(params, res);
          break;

        default:
          res.writeHead(400, {'content-type': 'text/plain'});
          res.end('unrecognized method: ' + req.body.method);
      }
    } catch (error) {
      respondWithError(res, error);
    }
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
