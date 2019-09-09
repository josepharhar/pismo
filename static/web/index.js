import defaultExport from '/web/util.js';
import ServerPrompt from '/web/serverPrompt.js';

console.log('hello from index.js');

const main = document.createElement('div');
document.body.appendChild(main);

(async () => {

  const serverPrompt = document.createElement('server-prompt');
  main.appendChild(serverPrompt);
  const address = await serverPrompt.resultPromise();
  main.removeChild(serverPrompt);

  // get trees
  const getTreesFetch = fetch

  console.log('TODO use address: ' + address);
  const fetchProgress = document.createElement('fetch-progress');
})();