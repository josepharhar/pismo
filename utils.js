/**
 * @param {!string} path
 */
exports.pathToUnix = function(path) {
  return path.replace(/\\/g, '/');
}
