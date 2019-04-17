const fs = require('fs');

//const request = require('./node_modules/request');
const request = require('request');

const req = request.post('localhost:48880/fileupload', (err, resp, body) => {
  if (err)
    console.log('error: ' + err);
  else
    console.log('url: ' + url);
});

const form = req.form();
form.append(fs.createReadStream(process.argv[2]));
