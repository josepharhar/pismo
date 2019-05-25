const path = require('path');
const fs = require('fs');

// @ts-ignore
const nanoutimes = require('nanoutimes');
// @ts-ignore
const nanostat = require('nanostat');

const diff = require('./diff.js');
const branch = require('./branch.js');
const pismoutil = require('./pismoutil.js');
const {logInfo, logError} = pismoutil.getLogger(__filename);

/** @typedef {pismoutil.FileTime} FileTime */

/**
 * @param {string} srcFilepath
 * @param {string} destFilepath
 */
function copyFileTime(srcFilepath, destFilepath) {
  const stats = nanostat.statSync(srcFilepath);
  const atimeS = null;
  const atimeNs = null;
  const mtimeS = stats.mtimeMs / 1000n;
  const mtimeNs = stats.mtimeNs;
  nanoutimes.utimesSync(destFilepath, atimeS, atimeNs, mtimeS, mtimeNs);
}

/**
 * @param {import('yargs').Arguments} argv
 */
exports.apply = async function(argv) {
  /** @type {pismoutil.MergeFile} */
  const mergefile = await pismoutil.readFileToJson(argv.mergefile);

  for (const {operator, operands} of mergefile.operations) {
    //let srcFilepath = null, destFilepath = null;

    /** @type {!Array<!Branch>} */
    const operandBranches = operands.map(operand => {
      if (operand.tree === 'base') {
        return new Branch(mergefile.baseBranch);
      } else if (operand.tree === 'other') {
        return new Branch(mergeFile.otherBranch);
      } else {
        throw new Error(`Unrecognized operand value for 'tree': expected 'base' or 'other'. was: ${operands[0].tree}`);
      }
    });

    const srcBranch = operands.length > 0 ? operandBranches[0] : null;
    const destBranch = operands.length > 1 ? operandBranches[1] : null;
    const srcRelativePath = operands.length > 0 ? operands[0].relativePath : null;
    const destRelativePath = operands.length > 1 ? operands[1].relativePath : null;

    switch (operator) {
      case 'touch':
        try {
          const srcFileTime = await srcBranch.getFileTime(srcRelativePath);
          await destBranch.setFileTime(destRelativePath, srcFileTime);
        } catch (error) {
          logError(`Failed to copy file time`
            + `\n  from: ${srcBranch.rawString()} ${srcRelativePath}`
            + `\n    to: ${destBranch.rawString()} ${destRelativePath}`);
          throw error;
        }

      case 'cp':
        if (srcBranch.remote() && destBranch.remote()) {
          if (srcBranch.remote() !== destBranch.remote()) {
            throw new Error(`TODO: support copying between separate remotes`);
          }
          const remote = await remote.getOrCreateRemote(srcBranch.remote());
          await remote.copyFileWithinRemote(srcBranch.name(), srcRelativePath, destBranch.name(), destRelativePath);

        } else if (srcBranch.remote() && !destBranch.remote()) {
          const remote = await remote.getOrCreateRemote(srcBranch.remote());
          const absoluteDestPath = destBranch = path.join(tree
            aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
          await remote.copyFileFromRemote(srcBranch.name(), srcRelativePath, 

        } else if (!srcBranch.remote() && destBranch.remote()) {
        } else {
        }




        srcFilepath = path.join(mergefile[operands[0].tree], operands[0].relativePath);
        destFilepath = path.join(mergefile[operands[1].tree], operands[1].relativePath);

        const copyFileError = await new Promise(resolve => {
          fs.copyFile(srcFilepath, destFilepath, resolve);
        });
        if (copyFileError) {
          logError(`Failed to copy from ${srcFilepath} to ${destFilepath}`);
          throw copyFileError;
        }

        try {
          copyFileTime(srcFilepath, destFilepath);
        } catch (err) {
          logError(`Failed to copy file time from ${srcFilepath} to ${destFilepath}`);
          throw err;
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
