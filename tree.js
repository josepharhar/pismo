const fs = require('fs');
const child_process = require('child_process');
const util = require('util');
const path = require('path');

const utils = require('./utils.js');

/**
 * @param {!string} filepath
 * @return {?object}
 */
exports.readTreeFromFile = async function(filepath) {
  let data = null;
  try {
    data = await utils.readFile(filepath);
  } catch (e) {
    console.log('readTreeFromFile() failed to read file at path: ' + filepath);
    return null;
  }

  let json = null;
  try {
    json = JSON.parse(data);
  } catch (e) {
    console.log('readTreeFromFile() failed to parse JSON from file: ' + filepath);
    return null;
  }

  // run some sanity checks
  if (!json.basepath || !json.file_info_array) {
    console.log('readTreeFromFile() JSON file has invalid format: ' + filepath);
    return null;
  }

  return json;
}

exports.treeDifferator = async function(aTree, bTree) {
}

/**
 * @param {!Tree} aTree
 * @param {!Tree} bTree
 * @return {!Array}
 */
exports.findDuplicates = async function(aTree, bTree) {
}
