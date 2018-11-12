// TODO use 'scp2' to do ssh based merging

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
  if (!srcTree || !destTree) {
    console.log('merge: failed to read srcTree or destTree');
    return;
  }

}
