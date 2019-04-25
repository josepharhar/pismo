const path = require('path');
const fs = require('fs');
const stream = require('stream');

const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const progress = require('progress-stream');

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

  respondWithJson(res, treeNamesToPaths);
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
    switch (req.body.method) {
      case 'list':
        await handleList(params, res);
        break;

      case 'get-tree':
        await handleGetTree(params, res);
        break;

      default:
        res.writeHead(400, {'content-type': 'text/plain'});
        res.end('unrecognized method: ' + req.body.method);
    }
  });

  app.listen(port);

  /*const upload = multer();
  const uploadType = upload.fields([
    { name: 'file' },
    { name: 'metadata'}
  ]);
  app.post('/fileupload', uploadType, async (req, res) => {
    console.log('req.files: ' + JSON.stringify(req.files, null, 2));
    console.log('req.body: ' + JSON.stringify(req.body, null, 2));
  });*/
  async function writeStreamToFile(stream, filename) {
    fs.createWriteStream(filename);
    return new Promise((resolve, reject) => {
    });
  }
  app.post('/fileupload', async (req, res) => {
    console.log(`${req.statusCode} ${req.url}`);
    const length = req.headers['content-length'];
    const fileWriteStream = fs.createWriteStream('output.o');

    const progressStream = progress({
      length: length,
      time: 1000 /* ms */
    }, progress => {
      console.log('progress: ' + JSON.stringify(progress));
    });

    req.pipe(progressStream).pipe(fileWriteStream);
  });
}
