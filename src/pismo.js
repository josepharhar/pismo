#!/usr/bin/env node

// TODO delet this
const defaultHandler = argv => console.log('todo handler. argv: ' + JSON.stringify(argv, null, 2));

require('yargs')
  .command(
    'scan <treejson> [scandir]',
    'Builds a file tree rooted at the filepath pointed to by [scandir] and writes it to <treejson>. If <treejson> already exists, [scandir] is not needed and <treejson> will be updated with any changes on disk',
    yargs => yargs
        .help(false)
        .version(false),
    defaultHandler)

  .command(
    'diff <basejson> <otherjson>',
    'TODO description',
    yargs => yargs
        .help(false)
        .version(false),
    defaultHandler)

  .command(
    'merge-gen <basetreejson> <othertreejson> <outfilejson>',
    'todo description',
    yargs => yargs
        .option('mode', {
          choices: ['one-way-mirror', 'two-way-sync'],
          default: 'one-way-mirror'
        })
        .option('rofl', {
          description: 'ayylmao'
        })
        .demandOption('rofl')
        .help(false)
        .version(false),
    defaultHandler)

  .command(
    'merge-apply <mergefile>',
    'todo description',
    yargs => yargs
        .help(false)
        .version(false),
    defaultHandler)

  .demandCommand()
  .strict()
  // .wrap(Math.min(80, yargs.terminalWidth()) // default
  .wrap(null)
  .argv;
