const fs = require('fs');
const http = require('http');

const progress = require('progress-stream');

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

const filepath = process.argv[2];
const readStream = fs.createReadStream(filepath);
const stats = fs.statSync(filepath);
const length = stats.size;

//const requestOptions = {
//  hostname: 'localhost',
//  port: 48880,
//  path: '/fileupload',
//  method: 'POST',
//  headers: {
//    'content-length': stats.size,
//    'content-type': 'application/octet-stream',
//    'transfer-encoding': 'chunked'/*,
//    'x-pismo-treename': 'todo',
//    // TODO this makes paths limited to ascii, i have to check for ascii here
//    'x-pismo-path': '/to/do'*/
//  }
//};
const requestOptions = {
  hostname: 'localhost',
  port: 48880,
  path: '/fileupload',
  method: 'POST',
  headers: {
    'connection': 'keep-alive',
    'x-pismo-length': stats.size
    //'content-length': stats.size,
    //'content-type': 'application/octet-stream',
    //'connection': 'keep-alive',
    //'transfer-encoding': 'chunked'/*,
    //'x-pismo-length': stats.size*/
  }
};
const request = http.request(requestOptions, async res => {
  console.log(`${res.statusCode} ${JSON.stringify(res.headers, null, 2)}`);
  try {
    const str = await streamToString(res);
    console.log('response body: ' + str);
  } catch (error) {
    console.log('response read error: ' + error);
  }
});
request.on('error', error => {
  console.log('request error: ' + JSON.stringify(error));
});
const progressStream = progress({
  length: length,
  time: 1000 /* ms */
}, progress => {
  console.log('progress: ' + JSON.stringify(progress));
});

// TODO uncomment this!!!
//readStream.pipe(progressStream).pipe(request);
readStream.pipe(request);
//request.end();
