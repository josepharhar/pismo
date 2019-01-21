const fs = require('fs');
const path = require('path');

const pismoutil = require('./pismoutil.js');

const writeFilePromise = util.promisify(fs.writeFile);

/**
 * @param {import('yargs').Arguments} argv
 */
exports.config = async function(argv) {
  const configpath = path.join(pismoutil.getDotPath(), '/config.json');
  let config = await pismoutil.readFileToJson(configpath);
  if (!config) {
    console.log('~/.pismo/config.json not found, creating...');
    config = {};
    try {
      await writeFilePromise(configpath,
        JSON.stringify(config, null, 2));
    } catch (err) {
      console.error('Failed to create ~/.pismo/config.json');
      throw err;
    }
  }

  if (argv.value) {
    config[argv.setting] = argv.value;
    try {
      await writeFilePromise(configpath,
        JSON.stringify(config, null, 2));
    } catch (err) {
      console.error('Failed to write to ~/.pismo/config.json');
      throw err;
    }
    return;
  }

  console.log(config[argv.setting]);
}

/**
 * @param {!string} setting
 * @return {?string}
 */
exports.getSetting(setting) {
  const configpath = path.join(pismoutil.getDotPath(),
    '/config.json');
  const config = await pismoutil.readFileToJson(configpath);
  if (!config)
    return null;
  return config[setting];
}
