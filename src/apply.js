import * as path from 'path';
import * as fs from 'fs';

// @ts-ignore
import * as nanoutimes from 'nanoutimes';
// @ts-ignore
import * as nanostat from 'nanostat';

import * as diff from './diff.js';
import * as branches from './branch.js';
import * as pismoutil from './pismoutil.js';
import * as remotes from './remote.js';
import * as mkdirp from 'mkdirp';
const {logInfo, logError} = pismoutil.getLogger(__filename);

// TODO delet this?
const Branch = branches.Branch;

/** @typedef {pismoutil.FileTime} FileTime */
/** @typedef {remotes.Remote} Remote */

/**
 * @param {string} absolutePath
 * @return {!pismoutil.FileTime}
 */
function getFileTime(absolutePath) {
  return /** @type {!pismoutil.FileTime} */ (nanostat.statSync(absolutePath));
}

/**
 * @param {string} absolutePath
 * @param {!pismoutil.FileTime} filetime
 */
function setFileTime(absolutePath, filetime) {
  nanoutimes.utimesSync(
    absolutePath,
    /* atimeS */ null,
    /* atimeNs */ null,
    filetime.mtimeS,
    filetime.mtimeNs);
}

/**
 * @param {import('./pismo.js').MergeApplyArgs} argv
 */
export async function apply(argv) {
  /** @type {pismoutil.MergeFile} */
  const mergefile = await pismoutil.readFileToJson(argv.mergefile);

  for (const {operator, operands} of mergefile.operations) {
    //let srcFilepath = null, destFilepath = null;

    /** @type {!Array<!Branch>} */
    const operandBranches = operands.map(operand => {
      if (operand.tree === 'base') {
        return new Branch(mergefile.baseBranch);
      } else if (operand.tree === 'other') {
        return new Branch(mergefile.otherBranch);
      } else {
        throw new Error(`Unrecognized operand value for 'tree': expected 'base' or 'other'. was: ${operands[0].tree}`);
      }
    });

    const srcBranch = operands.length > 0 ? operandBranches[0] : null;
    const destBranch = operands.length > 1 ? operandBranches[1] : null;
    const srcRelativePath = operands.length > 0 ? operands[0].relativePath : null;
    const destRelativePath = operands.length > 1 ? operands[1].relativePath : null;

    if (srcBranch.remote() && destBranch && destBranch.remote() && srcBranch.remote() !== destBranch.remote()) {
      console.error('TODO: support operating on separate remotes');
      continue;
    }

    // TODO print something for each one of these operations!
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
            console.error(`TODO: support copying between separate remotes`);
          }
          const remote = await remotes.getOrCreateRemote(srcBranch.remote());
          await remote.copyFileWithinRemote(srcBranch.name(), srcRelativePath, destBranch.name(), destRelativePath);

        } else if (srcBranch.remote() && !destBranch.remote()) {
          // copying srcBranch[srcRelativePath] (remote)
          //     to destBranch[destRelativePath] (local)
          const srcRemote = await remotes.getOrCreateRemote(srcBranch.remote());
          const treeFile = await pismoutil.readTreeByName(destBranch.name());
          const absoluteLocalDestPath = path.join(treeFile.path, destRelativePath);
          await srcRemote.copyFileFromRemote(
            srcBranch.name(),
            srcRelativePath,
            absoluteLocalDestPath);

          const srcFileTime = await srcRemote.getRemoteFileTime(
            srcBranch.name(),
            srcRelativePath);
          setFileTime(absoluteLocalDestPath, srcFileTime);

        } else if (!srcBranch.remote() && destBranch.remote()) {
          // copying srcBranch[srcRelativePath] (local)
          //     to destBranch[destRelativePath] (remote)
          const destRemote = await remotes.getOrCreateRemote(destBranch.remote());
          const treeFile = await pismoutil.readTreeByName(srcBranch.name());
          const absoluteLocalSrcPath = path.join(treeFile.path, srcRelativePath);
          // TODO what should *really* happen here if we get an error?
          await destRemote.copyFileToRemote(
            destBranch.name(),
            destRelativePath,
            absoluteLocalSrcPath);

          const srcFileTime = getFileTime(absoluteLocalSrcPath);
          await destRemote.setRemoteFileTime(
            destBranch.name(),
            destRelativePath,
            srcFileTime);

        } else {
          // local copy

          // TODO use a caching layer like remotes for this
          // TODO do i have to read the entire tree file? wouldnt that be slow?
          //      or is it fast enough with the caching layer?
          const srcTreeFile = await pismoutil.readTreeByName(srcBranch.name());
          const absoluteSrcPath = path.join(srcTreeFile.path, srcRelativePath);

          const destTreeFile = await pismoutil.readTreeByName(destBranch.name());
          const absoluteDestPath = path.join(destTreeFile.path, destRelativePath);

          const copyFileError = await new Promise(resolve => {
            fs.copyFile(absoluteSrcPath, absoluteDestPath, resolve);
          });
          if (copyFileError) {
            logError(`Failed to copy from ${absoluteSrcPath} to ${absoluteDestPath}`);
            throw copyFileError;
          }

          try {
            setFileTime(absoluteDestPath, getFileTime(absoluteSrcPath));
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
          const remote = await remotes.getOrCreateRemote(branch.remote());
          await remote.deleteRemoteFile(branch.name(), relativePath);

        } else {
          const treeFile = await pismoutil.readTreeByName(branch.name());
          const absolutePath = path.join(treeFile.path, relativePath);
          const error = await new Promise(resolve => {
            fs.unlink(absolutePath, resolve);
          });
          if (error) {
            if (error.code === 'ENOENT') {
              logError(`Couldn't delete ${absolutePath} because it doesn't exist.`);
            } else {
              logError(`Failed to delete ${absolutePath}`);
              throw error;
            }
          }
        }
        break;

      case 'mv':
        if (srcBranch.remote() && destBranch.remote()) {
          // TODO support separate remotes here
          const remote = await remotes.getOrCreateRemote(srcBranch.remote());
          await remote.moveFileWithinRemote(srcBranch.name(), srcRelativePath, destBranch.name(), destRelativePath);

        } else if (!srcBranch.remote() && !destBranch.remote()) {
          // TODO deduplicate code with 'cp' case
          const srcTreeFile = await pismoutil.readTreeByName(srcBranch.name());
          const absoluteSrcPath = path.join(srcTreeFile.path, srcRelativePath);

          const destTreeFile = await pismoutil.readTreeByName(destBranch.name());
          const absoluteDestPath = path.join(destTreeFile.path, destRelativePath);

          await new Promise((resolve, reject) => {
            mkdirp(path.dirname(absoluteDestPath), error => {
              if (error)
                reject(error);
              else
                resolve();
            });
          });
          const moveFileError = await new Promise(resolve => {
            fs.rename(absoluteSrcPath, absoluteDestPath, resolve);
          });
          if (moveFileError) {
            logError(`Failed to move file from ${absoluteSrcPath} to ${absoluteDestPath}`);
            throw moveFileError; // TODO maybe continue anyways here instead?
          }
        } else {
          throw new Error('TODO support moving between remotes');
        }
        break;

      default:
        throw new Error('unrecognized operator: ' + operator);
    }
  }
}
