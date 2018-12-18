class TreeFile {
  /**
   * @param {!string} name
   */
  constructor(name) {
    this._name = name;
  }
}

/**
 * @param {!string} name
 * @return {!TreeFile}
 */
exports.get = function(name) {
  return new TreeFile(name);
}

/**
 * @param {!string} name
 */
exports.add = function(name) {

}

exports.TreeFile = TreeFile;
