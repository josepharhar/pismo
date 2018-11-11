// TODO use 'scp2' to do ssh based merging

const utils = require('./utils.js');
const {scan} = require('./scan.js');

async function main() {
  function printUsageAndExit() {
    console.log('usage: node jsync.js scan <tree.json> [/path/to/scandir]');
    console.log('         If tree.json already exists, it will be updated.');
    console.log('       node jsync.js diff <a.json> <b.json>');
    console.log('       node jsync.js merge <src.json> <dest.json>');
    process.exit(1);
  }

  if (process.argv.length < 3)
    printUsageAndExit();

  const mode = process.argv.length[2];
  switch (mode) {
    case 'gen':
      if (process.argv.length != 5)
        printUsageAndExit();
      const outPath = process.argv[3];
      const scanPath = process.argv[4];
      break;

    case 'update':
      if (process.argv.length != 4)
        printUsageAndExit();
      const outPath = process.argv[3];
      break;

    case 'diff':
      if (process.argv.lenth != 5)
        printUsageAndExit();
      const aPath = process.argv[3];
      const bPath = process.argv[4];
      break;

    case 'merge':
      if (process.argv.length != 5)
        printUsageAndExit();
      const srcPath = process.argv[3];
      const destPath = process.argv[4];
      break;

    default:
      printUsageAndExit();
  }
}

main().catch(error => {
  console.log('caught error:');
  console.log(error);
});
