export class LocalBranch {
  /**
   * TODO make this only callable from static factory method
   * @param {string} name
   */
  constructor(name) {
    this._name = name;
  }
}

/** @type {!Map<string, !LocalBranch>} */
const _localBranchCache = new Map();
/**
 * @param {string} name
 */
export async function getLocalBranch(name) {
}