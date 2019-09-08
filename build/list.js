const fs = require('fs');
const path = require('path');
const util = require('util');
const os = require('os');
const filesize = require('filesize');
const pismoutil = require('./pismoutil.js');
const remote = require('./remote.js');
const readFilePromise = util.promisify(fs.readFile);
const readdirPromise = util.promisify(fs.readdir);
const { logInfo, logError } = pismoutil.getLogger(__filename);
/**
 * @param {string} name
 * @param {!pismoutil.TreeFile} tree
 * @param {boolean} verbose
 */
function printTree(name, tree, verbose) {
    console.log(name);
    if (!verbose)
        return;
    console.log('  path: ' + tree.path);
    if (tree.lastUpdated < 0) {
        console.log('  lastUpdated: never');
    }
    else {
        const date = pismoutil.epochToDate(tree.lastUpdated);
        const dateString = pismoutil.dateToString(date);
        const diffString = pismoutil.timeElapsedToString(date);
        console.log(`  last updated: ${dateString} (${diffString})`);
    }
    if (verbose) {
        // number of files
        console.log(`  number of files: ${tree.files.length}`);
        // total size
        let size = 0;
        for (const file of tree.files) {
            size += file.size;
        }
        console.log(`  total size: ${filesize(size)}`);
    }
}
/**
 * @param {import('./pismo.js').ListArgs} argv
 */
exports.list = async function (argv) {
    const treeNamesToPaths = await pismoutil.getTreeNamesToPaths();
    let first = true;
    for (const name in treeNamesToPaths) {
        if (argv.verbose) {
            if (first)
                first = false;
            else
                console.log();
        }
        /** @type {!pismoutil.TreeFile} */
        const tree = await pismoutil.readFileToJson(treeNamesToPaths[name]);
        if (tree === null) {
            logError('Failed to read tree json file for name: ' + name);
            return;
        }
        printTree(name, tree, argv.extra);
    }
    // iterate remotes, print out their trees
    const remotes = await remote.Remote.getAllRemotes();
    for (const remote of remotes) {
        await remote.readFromFile();
        const remoteTreeNamesToPaths = await remote.getTreeNamesToPaths();
        for (const name in remoteTreeNamesToPaths) {
            if (argv.verbose) {
                if (first)
                    first = false;
                else
                    console.log();
            }
            const tree = await pismoutil.readFileToJson(remoteTreeNamesToPaths[name]);
            if (tree === null) {
                logError(`Failed to read treeFile. remote: ${remote.name()}, name: ${name}`);
                return;
            }
            printTree(`${remote.name()}/${name}`, tree, argv.extra);
        }
    }
};
