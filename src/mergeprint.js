

import * as pismoutil from './pismoutil.js';

/**
 * @param {import('./pismo.js').MergePrintArgs} argv
 */
export async function mergePrint(argv) {
  /** @type {pismoutil.MergeFile} */
  const mergefile = await pismoutil.readFileToJson(argv.mergefile);

  /**
   * @param {'base'|'other'} baseOrOther 
   * @return {string}
   */
  function toBranchName(baseOrOther) {
    if (baseOrOther === 'base') {
      return mergefile.baseBranch;
    } else if (baseOrOther === 'other') {
      return mergefile.otherBranch;
    } else {
      throw new Error('this should never happen. baseOrOther: ' + baseOrOther);
    }
  }

  console.log(`preview of mergefile "${argv.mergefile}"`);

  for (const {operator, operands} of mergefile.operations) {

    const branchNames = operands.map(operand => {
      return toBranchName(operand.tree);
    });

    switch (operator) {
      case 'touch':
        pismoutil.logColor(pismoutil.Colors.yellow, `touch ${branchNames[0]}:${operands[0].relativePath}`);
        break;

      case 'cp':
        const color = operands[0].tree === 'base' ? pismoutil.Colors.green : pismoutil.Colors.red;
        pismoutil.logColor(color, `cp ${branchNames[0]}:${operands[0].relativePath} ${branchNames[1]}:${operands[1].relativePath}`);
        break;

      case 'rm':
        pismoutil.logColor(pismoutil.Colors.red, `rm ${branchNames[0]}:${operands[0].relativePath}`);
        break;
    }
  }
}