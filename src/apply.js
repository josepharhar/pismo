const path = require('path');
const fs = require('fs');

// @ts-ignore
const nanoutimes = require('nanoutimes');
// @ts-ignore
const nanostat = require('nanostat');

const diff = require('./diff.js');
const branch = require('./branch.js');
const pismoutil = require('./pismoutil.js');
const remotes = require('./remote.js');
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
          const remote = await remotes.getOrCreateRemote(srcBranch.remote());
          await remotes.copyFileWithinRemote(srcBranch.name(), srcRelativePath, destBranch.name(), destRelativePath);

        } else if (srcBranch.remote() && !destBranch.remote()) {
          // copying srcBranch[srcRelativePath] (remote)
          //     to destBranch[destRelativePath] (local)
          const srcRemote = remotes.getOrCreateRemote(srcBranch.remote());
          const treeFile = await pismoutil.readTreeByName(destBranch.name());
          const absoluteLocalDestPath = path.join(treeFile.path, destRelativePath);
          await srcRemote.copyFileFromRemote(
            srcBranch.name(),
            srcRelativePath,
            absoluteLocalDestPath);

        } else if (!srcBranch.remote() && destBranch.remote()) {
          // copying srcBranch[srcRelativePath] (local)
          //     to destBranch[destRelativePath] (remote)
          const destRemote = remotes.getOrCreateRemote(destBranch.remote());
          const treeFile = await pismoutil.readTreeByName(srcBranch.name());
          const absoluteLocalSrcPath = path.join(treeFile.path, srcRelativePath);
          // TODO what should *really* happen here if we get an error?
          await destRemote.copyFileToRemote(
            destBranch.name(),
            destRelativePath,
            absoluteLocalSrcPath);

        } else {
          // local copy

          // TODO use a caching layer like remotes for this
          const srcTreeFile = await pismoutil.readTreeByName(srcBranch.name());
          const absoluteSrcPath = path.join(srcTreeFile.path, srcRelativePath);

          const destTreeFile = await pismoutil.readTreeByName(destBranch.name());
          const absoluteDestPath = path.join(destTreeFile.path, destRelativePath);

          const copyFileError = await new Promsie(resolve => {
            fs.copyFile(absoluteSrcPath, absoluteDestPath, resolve);
          });
          if (copyFileError) {
            logError(`Failed to copy from ${absoluteSrcPath} to ${absoluteDestPath}`);
            throw copyFileError;
          }

          try {
            copyFileTime(absoluteSrcPath, absoluteDestPath);
          } catch (error) {
            logError(`Failed to copy file time from ${absoluteSrcPath} to ${absoluteDestPath}`);
            throw error;
          }
        }
        break;

      case 'rm':
        const branch = srcBranch;
        const relativePath = srcRelativePath;

        if (branch.remote()) {
          const remote = remotes.getOrCreateRemote(branch.remote());
          await remote.deleteRemoteFile(branch.name(), relativePath);

        } else {
          const treeFile = await pismoutil.readTreeByName(branch.name());
          const absolutePath = path.join(treeFile.path, relativePath);
          const error = await new Promise(resolve => {
            fs.unlink(absolutePath, resolve);
          });
          if (error) {
            logError(`Failed to delete ${absolutePath}`);
            throw error;
          }
        }
        break;

      default:
        throw new Error('unrecognized operator: ' + operator);
    }
  }
}
