const utils = require('./utils.js');
const {scan} = require('./scan.js');
const {diff} = require('./diff.js');
const {merge} = require('./merge.js');

async function main() {
  function printUsageAndExit() {
    console.log('usage: node jsync.js scan <tree.json> [/path/to/scandir]');
    console.log('         If tree.json already exists, it will be updated.');
    console.log('       node jsync.js diff <a.json> <b.json> [i]');
    console.log('       node jsync.js merge <src.json> <dest.json>');
    process.exit(1);
  }

  if (process.argv.length < 3)
    printUsageAndExit();

  const mode = process.argv[2];
  switch (mode) {
    case 'scan':
      if (process.argv.length < 4)
        printUsageAndExit();
      await scan(
        process.argv[3],
        process.argv.length > 4 ? process.argv[4] : null);
      break;

    case 'diff':
      if (process.argv.lenth < 5)
        printUsageAndExit();
      // TODO remove interactive from diff.js and move to merge.js?
      await diff(process.argv[3], process.argv[4],
        process.argv.length > 5 && process.argv[5] == 'i');
      break;

    case 'merge':
      if (process.argv.length != 5)
        printUsageAndExit();
      await merge(process.argv[3], process.argv[4]);
      break;

    default:
      printUsageAndExit();
  }
}

main().catch(error => {
  console.log('caught error:');
  console.log(error);
});
