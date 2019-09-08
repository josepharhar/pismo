const fs = require('fs');
const path = require('path');

const pismoutil = require('./pismoutil.js');
const {logInfo, logError} = pismoutil.getLogger(__filename);

/**
 * @param {import('./pismo.js').ConfigArgs} argv
 */
exports.config = async function(argv) {
  let config = await pismoutil.readDotFileFromJson('config.json');
  if (!config) {
    config = {};
  }

  if (argv.value) {
    config[argv.setting] = argv.value;
    try {
      await pismoutil.writeDotFile('config.json', config);
    } catch (err) {
      console.error('Failed to write to config.json');
      throw err;
    }
    return;
  }

  console.log(config[argv.setting]);
}

/**
 * @param {!string} setting
 * @return {!Promise<?string>}
 */
exports.getSetting = async function(setting) {
  const config = await pismoutil.readDotFileFromJson('config.json');
  if (!config)
    return null;
  return config[setting];
}
