const http = require('http');
const fs = require('fs');

/**
 * @param {import('yargs').Arguments} argv
 */
exports.remoteList = async function(argv) {

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

}

/**
 * @param {import('yargs').Arguments} argv
 */
exports.remoteAdd = async function(argv) {
  try {
  } catch (error) {
  }
}

/**
 * @param {import('yargs').Arguments} argv
 */
exports.remoteRemove = async function(argv) {
}

/**
 * Download all of the tree files from the remote. Track them all as local branches like git.
 *
 * @param {import('yargs').Arguments} argv
 */
exports.remoteUpdate = async function(argv) {
}
