class LocalBranch {
    /**
     * TODO make this only callable from static factory method
     * @param {string} name
     */
    constructor(name) {
        this._name = name;
    }
}
exports.LocalBranch = LocalBranch;
/** @type {!Map<string, !LocalBranch>} */
const _localBranchCache = new Map();
/**
 * @param {string} name
 */
exports.getLocalBranch = async function (name) {
};
