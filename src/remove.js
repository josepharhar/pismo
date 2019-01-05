const path = require('path');

exports.remove = async function(argv) {
  const treesPath = pismoutil.getTreesPath();

  const filepath = path.join(treesPath, `/${argv.name}`);
}
