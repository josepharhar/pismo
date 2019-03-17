const fs = require('fs');

const diff = require('./diff.js');
const pismoutil = require('./pismoutil.js');
const {logInfo, logError} = pismoutil.getLogger(__filename);

/** @typedef {pismoutil.TreeFile} TreeFile */
/** @typedef {pismoutil.FileInfo} FileInfo */
/** @typedef {pismoutil.Operation} Operation */

/**
 * @param {!TreeFile} baseTree
 * @param {!TreeFile} otherTree
 * @return {!Array<!Operation>}
 */
function mirrorBaseToOther(baseTree, otherTree) {
  /** @type {!Array<!Operation>} */
  const output = [];

  const differator = diff.differator(baseTree, otherTree);
  while (differator.hasNext()) {
    const [{treeFile, fileInfo}, second] = differator.next();

    if (second) {
      output.push({
        operator: second.fileInfo.hash === fileInfo.hash ? 'touch' : 'cp',
        operands: [{tree: 'base', relativePath: fileInfo.path},
                   {tree: 'other', relativePath: second.fileInfo.path}]
      });

    } else if (treeFile === baseTree) {
      output.push({
        operator: 'cp',
        operands: [{tree: 'base', relativePath: fileInfo.path},
                   {tree: 'other', relativePath: fileInfo.path}]
      });

    } else if (treeFile === otherTree) {
      output.push({
        operator: 'rm',
        operands: [{tree: 'other', relativePath: fileInfo.path}]
      });

    } else {
      throw new Error('this should never happen');
    }
  }

  return output;
}

/**
 * @param {import('yargs').Arguments} argv
 */
exports.merge = async function(argv) {
  const outputFilepath = argv['output-filepath'];

  const baseTree = await pismoutil.readTreeByName(argv.base);
  const otherTree = await pismoutil.readTreeByName(argv.other);

  // merge format will be a list of operations
  // each operation has:
  //   operator: rm, cp
  //   operands: one or two files, with specificity to base or other tree.
  //             [{tree: 'C:\cygwin64\home\jarhar', file: FileInfo}]
  // TODO use file tree name or path as identifier here??
  // TODO use path as unique identifier everywhere instead of nickname,
  //      reimplement nicknames as an optional feature

  const operations = mirrorBaseToOther(baseTree, otherTree);
  const output = {
    base: baseTree.path,
    other: otherTree.path,
    operations: operations
  };

  const writeFileError = await new Promise(resolve => {
    fs.writeFile(outputFilepath, JSON.stringify(output, null, 2), resolve);
  });
  if (writeFileError) {
    logError(`Failed to write merge file to filepath: ${outputFilepath}`);
    throw writeFileError;
  }
}
