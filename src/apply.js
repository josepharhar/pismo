const path = require('path');
const fs = require('fs');

const diff = require('./diff.js');
const pismoutil = require('./pismoutil.js');
const {logInfo, logError} = pismoutil.getLogger(__filename);

/**
 * @param {import('yargs').Arguments} argv
 */
exports.apply = async function(argv) {
  /** @type {pismoutil.MergeFile} */
  const mergefile = await pismoutil.readFileToJson(argv.mergefile);

  for (const {operator, operands} of mergefile.operations) {
    switch (operator) {
      case 'cp':
        const srcFilepath = path.join(mergefile[operands[0].tree], operands[0].relativePath);
        const destFilepath = path.join(mergefile[operands[1].tree], operands[1].relativePath);

        const copyFileError = await new Promise(resolve => {
          fs.copyFile(srcFilepath, destFilepath, resolve);
        });
        if (copyFileError) {
          logError(`Failed to copy from ${srcFilepath} to ${destFilepath}`);
          throw copyFileError;
        }

        const srcStat = await new Promise((resolve, reject) => {
          fs.stat(srcFilepath, (err, stats) => {
            if (err) {
              logError(`Failed to stat file: ${srcFilepath}`);
              reject(err);
            }
            resolve(stats);
          });
        });

        const utimesError = await new Promise(resolve => {
          fs.utimes(destFilepath, srcStat.atime, srcStat.mtime, resolve);
        });
        if (utimesError) {
          logError(`Failed to utime file ${destFilepath} with atime: ${srcStat.atime}, mtime: ${srcStat.mtime}`);
          throw utimesError;
        }
        break;

      case 'rm':
        const filepath = path.join(mergefile[operands[0].tree], operands[0].relativePath);
        const unlinkError = await new Promise(resolve => {
          fs.unlink(filepath, resolve);
        });
        if (unlinkError) {
          logError(`Failed to unlink ${filepath}`);
          throw unlinkError;
        }
        break;

      default:
        throw new Error('unrecognized operator: ' + operator);
    }
  }
}
