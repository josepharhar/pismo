const fs = require('fs');
const http = require('http');

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

const requestOptions = {
  hostname: 'localhost',
  port: 48880,
  path: '/fileupload',
  method: 'POST',
  headers: {
    'content-length': stats.size,
    'content-type': 'application/octet-stream',
    'transfer-encoding': 'chunked'
    'x-pismo-treename': 'todo',
    // TODO this makes paths limited to ascii, i have to check for ascii here
    'x-pismo-path': '/to/do'
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
  console.log('request error: ' + error);
});
readStream.pipe(request);

//const request = require('request');

/*const formData = {
  metadata: 'big data',
  file: fs.createReadStream(process.argv[2])
};
const req = request.post({
    url: 'http://localhost:48880/fileupload',
    formData: formData
  },
  (error, httpResponse, body) => {
    if (error) {
      console.log('error: ' + error);
      return;
    }
    console.log('file uploaded, response body: ' + body);
  });*/

/*const req = request.post('localhost:48880/fileupload', (err, resp, body) => {
  if (err)
    console.log('error: ' + err);
  else
    console.log('url: ' + url);
});

const form = req.form();
form.append(fs.createReadStream(process.argv[2]));*/
