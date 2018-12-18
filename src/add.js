const dotpismo = require('./dotpismo.js');

/**
 * @param {import('yargs').Arguments} argv
 */
exports.add = function(argv) {
  const name = argv.name;
  const path = argv.path;
  const noupdate = argv.noupdate;

  console.log(`Adding tree named ${name} rooted at ${path}`);



   const treefile = dotpismo.get(name);
}
