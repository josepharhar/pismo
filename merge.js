const open = util.promisify(fs.open);

async function main() {
  function printUsageAndExit() {
    console.log('usage: node merge.js <src.js> <dest.js>');
    process.exit(1);
  }

  if (process.argv.length != 4) {
    printUsageAndExit();
  }

  const commands_out_path = 'output.sh';
  const commands_out_fd = open(commands_out_path, 'w');
  async function writeCommand(command) {
    await new Promise((resolve, reject) => {
      fs.write(commands_out_fd, err => {
        if (err)
          reject(err);
        resolve();
      });
    });
  }
}

// TODO merge with diff.js
async function readToJson(absolute_filepath) {
  let data = null;
  try {
    data = await readFile(absolute_filepath);
  } catch (e) {
    console.log('failed to read file at path: ' + absolute_filepath);
    throw e;
  }

  try {
    return JSON.parse(data);
  } catch (e) {
    console.log('failed to parse file to json: ' + absolute_filepath);
    throw e;
  }
}

main().catch(error => {
  console.log('caught error:');
  console.log(error);
});
