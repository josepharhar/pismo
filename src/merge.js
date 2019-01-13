const path = require('path');
const fs = require('fs');

const diff = require('./diff.js');
const pismoutil = require('./pismoutil.js');
const {logInfo, logError} = pismoutil.getLogger(__filename);

/** @typedef {pismoutil.TreeFile} TreeFile */
/** @typedef {pismoutil.FileInfo} FileInfo */
/** @typedef {{operator: 'rm'|'cp', operands: !Array<[string, string]>}} Operation */

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
        operator: 'cp',
        operands: [[treeFile.path, fileInfo.path],
                   [second.treeFile.path, second.fileInfo.path]]
      });

    } else if (treeFile === baseTree) {
      output.push({
        operator: 'cp',
        operands: [[treeFile.path, fileInfo.path],
                   [otherTree.path, fileInfo.path]]
      });

    } else if (treeFile === otherTree) {
      output.push({
        operator: 'rm',
        operands: [[treeFile.path, fileInfo.path]]
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

  const output = mirrorBaseToOther(baseTree, otherTree);

  const writeFileError = await new Promise(resolve => {
    fs.writeFile(outputFilepath, JSON.stringify(output, null, 2), resolve);
  });
  if (writeFileError) {
    logError(`Failed to write merge file to filepath: ${outputFilepath}`);
    throw writeFileError;
  }
}
