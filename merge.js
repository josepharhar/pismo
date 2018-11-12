// TODO use 'scp2' to do ssh based merging
const readline = require('readline');

const utils = require('./utils.js');
const tree = require('./tree.js');

/**
 * @param {!string} srcPath
 * @param {!string} destPath
 */
exports.merge = async function(srcPath, destPath) {
  // so the idea of merge is that we can
  // - interactively create a new file tree json for dest
  // - view a diff of the generated tree with the actual dest tree for auditing
  // - commit the new tree by copying the files from the old tree
  // two-way merge should also be a feature.
  // this should also incorporate duplicate checking somehow.

  const srcTree = tree.readTreeFromFile(srcPath);
  const destTree = tree.readTreeFromFile(destPath);
  if (!srcTree) {
    console.log('merge: failed to read: ' + srcPath);
    return;
  }
  if (!destTree) {
    console.log('merge: failed to read: ' + destPath);
    return;
  }

  const newTree = {
    basepath: destTree.basepath,
    file_info_array: []
  };

  function mergeFileHuh(
      srcBasepath,
      srcFileInfo,
      destBasepath,
      destFileInfo) {
    const absoluteSrcPath = srcBasepath + srcFileInfo.path;
    const absoluteDestPath = destBasepath + destFileInfo.path;
    console.log(absoluteSrcPath + ' >>> ' + absoluteDestPath);
    console.log('  ' + absoluteSrcPath + ': '
      + JSON.stringify(srcFileInfo, null, 2));
    console.log('  ' + absoluteDestPath + ': '
      + JSON.stringify(destFileInfo, null, 2));

    let answer = null;
    while (answer != 'c' && /*answer != 'd' &&*/ answer != 'i') {
      //await readline.question('(c)opy, (d)elete, or (i)gnore? ');
      await readline.question('(c)opy or (i)gnore? ');
    }
    switch (answer) {
      case 'c':
        newTree.file_info_array.push(srcFileInfo);
        break;
      //case 'd':
      case 'i':
        break;
    }
  }

  const srcFiles = srcTree.file_info_array;
  const destFiles = destTree.file_info_array;
  let srcIndex = 0;
  let destIndex = 0;
  while (srcIndex < srcFiles.length && destIndex < destFiles.length) {
    if (srcIndex >= srcFiles.length) {
      // there is no src file, so src is missing next dest file
      // TODO
    } else if (destIndex >= destFiles.length) {
      // there is no dest file, so dest is missing next src file
      // TODO
    }

    const srcFileInfo = srcFiles[srcIndex];
    const destFileInfo = destFiles[destIndex];
    const absoluteSrcPath = srcTree.basepath + srcFileInfo.path;
    const absoluteDestPath = destTree.basepath + destFileInfo.path;

    if (srcFileInfo.path < destFileInfo.path) {
      // new file in src which is not in dest
      mergeFileHuh(srcTree.basepath, srcFileInfo,
        destTree.basepath, destFileInfo);
      srcIndex++;

    } else if (srcFileInfo.path > destFileInfo.path) {
      // new file in dest which is not in src
      // TODO if this is a one-way merge, this doesn't make sense...
      //mergeFileHuh(destTree.basepath, destFileInfo,
      destIndex++;

    } else {
      // files are identical?
      // TODO check hashes, modify time, etc. and decide what to do
      srcIndex++;
      destIndex++;
    }
  }
}
