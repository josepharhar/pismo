/** @typedef {'string'|'number'|'boolean'|!Array<*>|!Object<string, *>} JsonSchema */

/** @typedef {!{id: string, requestSchema: JsonSchema, responseSchema: JsonSchema}} PismoMethod */

/** @typedef {{path: string, mtimeS: number, mtimeNs: number, size: number, hash: string}} FileInfo */

/** @typedef {{path: string, lastUpdated: number, files: Array<FileInfo>}} TreeFile */

/** @typedef {{operator: 'rm'|'cp'|'touch', operands: !Array<{tree: 'base'|'other', relativePath: string}>}} Operation */

/** @typedef {{baseBranch: string, otherBranch: string, operations: !Array<!Operation>}} MergeFile */

/** @typedef {!{mtimeS: number, mtimeNs: number}} FileTime */

/** @type {!JsonSchema} */
export const FileInfoSchema = {
  path: 'string',
  mtimeS: 'number',
  mtimeNs: 'number',
  size: 'number',
  hash: 'string'
};
export const TreeFileSchema = {
  path: 'string',
  // lastUpdated can be -1 to signal that an update never happened
  lastUpdated: 'number',
  files: [FileInfoSchema]
};
/** @typedef {void} GetTreesRequest */

/** @typedef {!{trees: !Array<!{treename: string, treefile: !TreeFile}>}} GetTreesResponse */

/** @type {!PismoMethod} */

export const GetTrees = {
  id: 'get-trees',
  requestSchema: null,
  responseSchema: {
    trees: [{
      treename: 'string',
      treefile: TreeFileSchema
    }]
  }
};
/** @typedef {!{treename: string, relativePath: string}} GetFileTimeParams */

/** @typedef {!{mtimeS: number, mtimeNs: number}} GetFileTimeResponse */

/** @type {!PismoMethod} */

export const GetFileTime = {
  id: 'get-file-time',
  requestSchema: {
    treename: 'string',
    relativePath: 'string'
  },
  responseSchema: {
    mtimeS: 'number',
    mtimeNs: 'number'
  }
};
/**
 * @typedef {!{
 *   treename: string,
 *   relativePath: string,
 *   mtimeS: number,
 *   mtimeNs: number
 * }} SetFileTimeParams
 */

/** @typedef {void} SetFileTimeResponse */

/** @type {!PismoMethod} */

export const SetFileTime = {
  id: 'set-file-time',
  requestSchema: {
    treename: 'string',
    relativePath: 'string',
    mtimeS: 'number',
    mtimeNs: 'number'
  },
  responseSchema: null
};
/** @typedef {!{treename: string, relativePath: string}} GetFileParams */

/** @type {!PismoMethod} */

export const GetFile = {
  id: 'get-file',
  requestSchema: {
    treename: 'string',
    relativePath: 'string'
  },
  responseSchema: null
};
/** @typedef {!{treename: string, relativePath: string, filesize: number}} PreparePutFileParams */

/** @typedef {!{putId: string}} PreparePutFileResponse */

/** @type {!PismoMethod} */

export const PreparePutFile = {
  id: 'prepare-put-file',
  requestSchema: {
    treename: 'string',
    relativePath: 'string',
    filesize: 'number'
  },
  responseSchema: {
    putId: 'string'
  }
};
/**
 * @typedef {!{
 *   srcTreename: string,
 *   srcRelativePath: string,
 *   destTreename: string,
 *   destRelativePath: string
 * }} CopyWithinParams
 */

/** @type {!PismoMethod} */

export const CopyWithin = {
  id: 'copy-within',
  requestSchema: {
    srcTreename: 'string',
    srcRelativePath: 'string',
    destTreename: 'string',
    destRelativePath: 'string'
  },
  responseSchema: null
};
/** @typedef {!{treename: string, relativePath: string}} DeleteFileParams */

/** @type {!PismoMethod} */

export const DeleteFile = {
  id: 'delete-file',
  requestSchema: {
    treename: 'string',
    relativePath: 'string'
  },
  responseSchema: null
};