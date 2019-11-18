import * as path from 'path';

import * as remotes from './remote.js';
import * as pismoutil from './pismoutil.js';
import * as PismoBranch from '../web/src/PismoBranch';

export class Branch {
  /**
   * @param {string} string
   */
  constructor(string) {
    this._pismoBranch = new PismoBranch.PismoBranch(string);
  }

  /**
   * @return {string}
   */
  remote() {
    return this._pismoBranch.remote();
  }

  /**
   * @return {string}
   */
  name() {
    return this._pismoBranch.name();
  }

  /**
   * @return {string}
   */
  rawString() {
    return this._pismoBranch.rawString();
  }

  /**
   * @return {!Promise<!pismoutil.TreeFile>}
   */
  async readTreeByName() {
    if (this.remote()) {
      const remote = await remotes.getOrCreateRemote(this.remote());
      return await remote.readTreeByName(this.name());
    }
    return pismoutil.readTreeByName(this.name());
  }

  /**
   * @param {string} relativePath
   * @return {!Promise<!pismoutil.FileTime>}
   */
  async getFileTime(relativePath) {
    if (this.remote()) {
      const remote = await remotes.getOrCreateRemote(this.remote());
      return await remote.getRemoteFileTime(this.name(), relativePath);
    }

    // TODO move readTreeByName into this...?
    const treeFile = await pismoutil.readTreeByName(this.name());
    const absolutePath = path.join(treeFile.path, relativePath);
    return pismoutil.getLocalFileTime(absolutePath);
  }

  /**
   * @param {string} relativePath
   * @param {!pismoutil.FileTime} fileTime
   */
  async setFileTime(relativePath, fileTime) {
    if (this.remote()) {
      const remote = await remotes.getOrCreateRemote(this.remote());
      await remote.setRemoteFileTime(this.name(), relativePath, fileTime);
      return;
    }

    const treeFile = await pismoutil.readTreeByName(this.name());
    const absolutePath = path.join(treeFile.path, relativePath);
    pismoutil.setLocalFileTime(absolutePath, fileTime);
  }
//
//  /**
//   * @param {!Remote} remote
//   * @param {string} relativePath
//   */
//  async copyFileFromRemote(remote, relativePath) {
//    if (this.remote()) {
//      throw new Error(`TODO: implement copying files from remote to remote. name: ${this.name}, relativePath: ${relativePath}`);
//    }
//
//    const treeFile = await pismoutil.readTreeByName(this.name());
//    const absoluteDestPath = path.join(treeFile.path, relativePath);
//    await remote.copyFileFromRemote(treeName, relativePath, absoluteDestPath);
//  }
}
