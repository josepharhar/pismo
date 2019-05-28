exports.Branch = class {
  /**
   * @param {string} string
   */
  constructor(string) {
    if ((string.match(/\//g) || []).length > 1)
      throw new Error(`More than one '/' in branch string: ${string}`);

    let remote = null, name = null;
    if (string.includes('/')) {
      [remote, name] = string.split('/');
      const [remote, name] = string.split('/')
    } else {
      name = string;
    }
    if (!name)
      throw new Error(`Failed to parse branch string: ${string}`);

    /** @type {string} */
    this._rawString = string;
    /** @type {string} */
    this._remote = remote;
    /** @type {string} */
    this._name = name;
  }

  /**
   * @return {string}
   */
  remote() {
    return this._remote;
  }

  /**
   * @return {string}
   */
  name() {
    return this._name;
  }

  /**
   * @return {string}
   */
  rawString() {
    return this._rawString;
  }

  /**
   * @param {string} relativePath
   * @return {!Promise<!pismoutil.FileTime>}
   */
  async getFileTime(relativePath) {
    if (this.remote()) {
      const remote = await remote.getOrCreateRemote(this.remote());
      return await remote.getRemoteFileTime(this.name(), relativePath);
    }

    // TODO move readTreeByName into this...?
    const treeFile = await pismoutil.readTreeByName(this.name());
    const absolutePath = path.join(treeFile.path, relativePath);
    return pismoutil.getLocalFileTime(absolutePath);
  }

  /**
   * @param {string} relativePath
   * @param {!FileTime} fileTime
   */
  async setFileTime(relativePath, fileTime) {
    if (this.remote()) {
      const remote = await remote.getOrCreateRemote(this.remote());
      await remote.setRemoteFileTime(this.name(), relativePath, fileTime);
      return;
    }

    const treeFile = await pismoutil.readTreeByName(this.name());
    const absolutePath = path.join(treeFile.path, relativePath);
    pismoutil.setLocalFileTime(absolutePath, fileTime);
  }

  /**
   * @param {!Remote} remote
   * @param {string} relativePath
   */
  async copyFileFromRemote(remote, relativePath) {
    if (this.remote()) {
      throw new Error(`TODO: implement copying files from remote to remote. name: ${this.name}, relativePath: ${relativePath}`);
    }

    const treeFile = await pismoutil.readTreeByName(this.name());
    const absoluteDestPath = path.join(treeFile.path, relativePath);
    await remote.copyFileFromRemote(treeName, relativePath, absoluteDestPath);
  }
}
