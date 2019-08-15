#!/usr/bin/env node

// @ts-ignore
BigInt.prototype.toJSON = function() {
  // TODO this is probably not a good idea, i think i should
  //   actually use numbers instead of bigints in nanostat
  return Number(this.toString());
}

const yargs = require('yargs');

const {list} = require('./list.js');
const {add} = require('./add.js');
const {update, updateAll} = require('./update.js');
const {remove} = require('./remove.js');
const {merge} = require('./merge.js');
const {diff, dupes} = require('./diff.js');
const {apply} = require('./apply.js');
const {config} = require('./config.js');
const {commit} = require('./commit.js');
const {status} = require('./status.js');
const {server} = require('./server.js');
const {remoteAdd, remoteRemove, remoteList, remoteUpdate} = require('./remote.js');
const {mergePrint} = require('./mergeprint.js');

function run(fn) {
  return function(argv) {
    fn(argv).catch(error => {
      console.log('Pismo failed with error:');
      console.log(error);
      console.error(error);
      process.exit(1);
    });
  }
}

// TODO delet this
const defaultHandler = argv => console.log('Not implemented yet. argv: ' + JSON.stringify(argv, null, 2));

/** @typedef {yargs.Arguments<{verbose: boolean}>} ListArgs */
yargs.command(
  'list',
  'Lists directory trees stored in ~/.pismo.',
  yargs => yargs
      .option('verbose', {
        description: 'Print out extra information about each tree',
        default: false,
        alias: 'l'
      })
      .help(false)
      .version(false),
  run(list));

/** @typedef {yargs.Arguments<{path: string, name: string}>} AddArgs */
yargs.command(
  'add <name> <path>',
  'Adds a new directory tree to ~/.pismo named <name> and rooted at the filepath <path>.',
  yargs => yargs
      .option('noupdate', {
        description: "Don't run a scan on the new file tree",
        default: false
      })
      .help(false)
      .version(false),
  run(add));

/** @typedef {yargs.Arguments<{name: string}>} RemoveArgs */
yargs.command(
  'remove <name>',
  'Removes a directory tree from ~/.pismo named <name>.',
  yargs => yargs
      .help(false)
      .version(false),
  run(remove));

/** @typedef {yargs.Arguments<{name: string, url: string}>} RemoteAddArgs */
yargs.command(
  'remote-add <name> <url>',
  'Adds a remote pismo server at the specified url.',
  yargs => yargs
      .positional('name', {
        description: 'new name used to reference the remote.'
      })
      .positional('url', {
        description: 'host URL. ex: http://example.com:48880'
      })
      .help(false)
      .version(false),
  run(remoteAdd));

/** @typedef {yargs.Arguments<{name: string}>} RemoteRemoveArgs */
yargs.command(
  'remote-remove <name>',
  'Deletes a remote you are currently tracking.',
  yargs => yargs
      .positional('name', {
        description: 'name of the remote to remove.'
      })
      .help(false)
      .version(false),
  run(remoteRemove));

/** @typedef {yargs.Arguments<{name: string}>} RemoteUpdateArgs */
yargs.command(
  ['fetch <name>', 'remote-update <name>'],
  'Downloads information about all directory trees on remote server.',
  yargs => yargs
      .positional('name', {
        description: 'name of the remote to update.'
      })
      .option('prune', {
        description: 'Delete all local trees no longer on the remote server',
        default: false
      })
      .help(false)
      .version(false),
  run(remoteUpdate));

/** @typedef {yargs.Arguments<{}>} RemoteListArgs */
yargs.command(
  ['remote', 'remote-list'],
  'Lists all of the remotes you are currently tracking.',
  yargs => yargs
      .strict(true)
      .help(false)
      .version(false),
  run(remoteList));

/** @typedef {yargs.Arguments<{name: string, nocache: boolean}>} UpdateArgs */
yargs.command(
  'update <name>',
  'Runs a scan on the file tree named <name>, updating the state of the tree stored in ~/.pismo',
  yargs => yargs
      .option('nocache', {
        description: 'Recalculate hashes for each file instead of reusing them based on file modified time',
        default: false
      })
      .help(false)
      .version(false),
  run(update));

/** @typedef {yargs.Arguments<{nocache: boolean}>} UpdateAllArgs */
yargs.command(
  'update-all',
  'Scans all local file trees',
  yargs => yargs
      .option('nocache', {
        description: 'Recalculate hashes for each file instead of reusing them based on file modified time',
        default: false
      })
      .help(false)
      .version(false),
  run(updateAll));

/** @typedef {yargs.Arguments<{base: string, other: string}>} DiffArgs */
yargs.command(
  'diff <base> [other]',
  'Compares the contents of the directory trees named <base> and [other], and prints out the differences. If [other] is unset and backups are enabled, compares between backup and newest version of <base>.', // TODO this is wrong
  yargs => yargs
      .option('order', {
        choices: ['filesize', 'name'],
        default: 'name',
        description: 'order to list duplicates in'
      })
      .option('printall', {
        default: false,
        alias: 'a'
      })
      .option('printdupes', {
        default: false,
        alias: 'd'
      })
      .help(false)
      .version(false),
  run(diff));

/** @typedef {yargs.Arguments<{base: string, other: string}>} DupesArgs */
yargs.command(
  'dupes <base> [other]',
  'Lists files with the same hash within one directory and optionally another',
  yargs => yargs
      .option('order', {
        choices: ['filesize', 'name'],
        default: 'name',
        description: 'order to list duplicates in'
      })
      .option('printall', {
        default: false,
        alias: 'a'
      })
      .help(false)
      .version(false),
  run(dupes));

/** @typedef {yargs.Arguments<{base: string, other: string, 'output-filepath': string}>} MergeGenArgs */
yargs.command(
  'merge-gen <base> <other> <output-filepath>',
  'Compares the directory trees named <base> and <other> and writes a merge file to the path <output-filepath>, which can then be applied by using merge-apply.',
  yargs => yargs
      .option('mode', {
        choices: ['one-way-mirror', 'two-way-sync', 'one-way-add'],
        default: 'one-way-mirror',
        description: 'Preset to generate merge file with'
      })
      .help(false)
      .version(false),
  run(merge));

/** @typedef {yargs.Arguments<{mergefile: string}>} MergeApplyArgs */
yargs.command(
  'merge-apply <mergefile>',
  'Copies and moves files based on the contents in <mergefile>, which is generated by using merge-gen',
  yargs => yargs
      .help(false)
      .version(false),
  run(apply));

/** @typedef {yargs.Arguments<{mergefile: string}>} MergePrintArgs */
yargs.command(
  'merge-print <mergefile>',
  'Prints out a merge json file generated with merge-gen in a human readable diff format',
  yargs => yargs
      .help(false)
      .version(false),
  run(mergePrint));

/** @typedef {yargs.Arguments<{setting: string, value: string}>} ConfigArgs */
yargs.command(
  'config <setting> [value]',
  'Sets configuration variables stored in ~/.pismo/config.json',
  yargs => yargs
      .help(false)
      .version(false),
  run(config));

/** @typedef {yargs.Arguments<{name: string}>} StatusArgs */
yargs.command(
  'status <name>',
  'Gets observed changes since last commit to file tree named <name>. Does nothing if backups are disabled.',
  yargs => yargs
      .help(false)
      .version(false),
  run(status));

/** @typedef {yargs.Arguments<{name: string}>} CommitArgs */
yargs.command(
  'commit <name>',
  'Commits changes to file tree named <tree>, removing the backup "image" of the file tree. Does nothing if backups are disabled.',
  yargs => yargs
      .help(false)
      .version(false),
  run(commit));

/** @typedef {yargs.Arguments<{port: string}>} ServerArgs */
yargs.command(
  'server [port]',
  'Runs a pismo protocol server so this computer can be synced by a remote client.',
  yargs => yargs
      .positional('port', {
        description: 'port to bind on',
        default: 48880
      })
      .help(false)
      .version(false),
  run(server));

//  yargs.command(
//    'http [port]',
//    'Runs a web interface to use pismo on this computer instead of the cli.',
//    yargs => yargs
//        .positional('port', {
//          description: 'port to bind http server to',
//          default: 48880
//        })
//        .help(false)
//        .version(false),
//    defaultHandler)

  // TODO add global config to change ~/.pismo to custom directory

yargs
  .demandCommand() // TODO why do i have this??
  .strict() // TODO what does this do?
  // .wrap(Math.min(80, yargs.terminalWidth()) // default
  .wrap(null) // TODO why?
  .argv; // TODO why?
