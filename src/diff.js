const path = require('path');
const fs = require('fs');

const pismoutil = require('./pismoutil.js');
const {logInfo, logError} = pismoutil.getLogger(__filename);

/**
 * @param {import('yargs').Arguments} argv
 */
exports.diff = async function(argv) {
  const baseName = argv.base;
  const otherName = argv.other;

  const baseTree = await pismoutil.readTreeByName(baseName);
  const otherTree = await pismoutil.readTreeByName(otherName);

  pismoutil.logColor(pismoutil.Colors.bright,
    `pismo diff ${baseName} ${otherName}`
      + `\n  ${baseName}`
      + `\n    path: ${baseTree.path}`
      + `\n  ${otherName}`
      + `\n    path: ${otherTree.path}`);

  console.log(`Comparing differences between ${baseName} and ${otherName}`);

  // Files list is already sorted
  let baseIndex = 0, otherIndex = 0;
  while (baseIndex < baseTree.files.length && otherIndex < otherTree.files.length) {
    const nextBaseFile = baseIndex < baseTree.files.length
        ? baseTree.files[baseIndex]
        : null;
    const nextOtherFile = otherIndex < otherTree.files.length
        ? otherTree.files[otherIndex]
        : null;

    if (!nextOtherFile || nextBaseFile.path < nextOtherFile.path) {
      // found a file in base that came before next file in other,
      // so a new file is present in base that is missing in other.
      // TODO check require('tty').isatty() before using colors
      pismoutil.logColor(pismoutil.Colors.green,
        ` + ${baseName}${nextBaseFile.path}`);
      baseIndex++;

    } else if (!nextBaseFile || nextOtherFile.path < nextBaseFile.path) {
      pismoutil.logColor(pismoutil.Colors.red,
        ` - ${otherName}${nextOtherFile.path}`);
      otherIndex++;

    } else {
      // files are in same location but are different
      if (JSON.stringify(nextBaseFile) !== JSON.stringify(nextOtherFile)) {
        let message = ' ' + nextBaseFile.path;
        for (const prop in nextBaseFile) {
          message += `  + ${prop}: ${nextBaseFile[prop]}`;
          message += `  + ${prop}: ${nextOtherFile[prop]}`;
        }
        pismoutil.logColor(pismoutil.Colors.yellow, message);
      }
      baseIndex++;
      otherIndex++;
    }
  }
}
