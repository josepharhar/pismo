/**
 * @param {!string} path
 */
exports.pathToUnix = function(path) {
  return path.replace(/\\/g, '/');
}

exports.readFile = util.promisify(fs.readFile);
exports.lstat = util.promisify(fs.lstat);
exports.writeFile = util.promisify(fs.writeFile);
exports.exec = util.promisify(child_process.exec);
exports.open = util.promisify(fs.open);
