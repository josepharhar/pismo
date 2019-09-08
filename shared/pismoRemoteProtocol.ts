type JsonSchema = string | number | boolean | Array<any> | Object;

interface PismoMethod {
  id: string;
  requestSchema: JsonSchema;
  responseSchema: JsonSchema;
}

interface FileInfo {
  path: string;
  mtimeS: number;
  mtimeNs: number;
  size: number;
  hash: string;
}

interface TreeFile {
  path: string;
  lastUpdated: number;
  files: Array<FileInfo>;
}

interface Operation {
  operator: 'rm'|'cp'|'touch';
  operands: Array<{tree: 'base'|'other', relativePath: string}>;
}

interface MergeFile {
  baseBranch: string;
  otherBranch: string;
  operations: Array<Operation>;
}

interface FileTime {
  mtimeS: number;
  mtimeNs: number;
}

/** @typedef {'string'|'number'|'boolean'|!Array<*>|!Object<string, *>} JsonSchema */
/** @typedef {!{id: string, requestSchema: JsonSchema, responseSchema: JsonSchema}} PismoMethod */
/** @typedef {{path: string, mtimeS: number, mtimeNs: number, size: number, hash: string}} FileInfo */
/** @typedef {{path: string, lastUpdated: number, files: Array<FileInfo>}} TreeFile */
/** @typedef {{operator: 'rm'|'cp'|'touch', operands: !Array<{tree: 'base'|'other', relativePath: string}>}} Operation */
/** @typedef {{baseBranch: string, otherBranch: string, operations: !Array<!Operation>}} MergeFile */
/** @typedef {!{mtimeS: number, mtimeNs: number}} FileTime */
/** @type {!JsonSchema} */
export const FileInfoSchema: JsonSchema = {
  path: 'string',
  mtimeS: 'number',
  mtimeNs: 'number',
  size: 'number',
  hash: 'string'
};

/** @type {!JsonSchema} */
export const TreeFileSchema: JsonSchema = {
  path: 'string',
  // lastUpdated can be -1 to signal that an update never happened
  lastUpdated: 'number',
  files: [FileInfoSchema]
};


/** @typedef {void} GetTreesRequest */
type GetTreesRequest = void;
/** @typedef {!{trees: !Array<!{treename: string, treefile: !TreeFile}>}} GetTreesResponse */
interface GetTreesResponse {
  trees: Array<{treename: string, treefile: TreeFile}>;
}
/** @type {!PismoMethod} */
export const GetTrees: PismoMethod = {
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
interface GetFileTimeParams {
  treename: string;
  relativePath: string;
}
/** @typedef {!{mtimeS: number, mtimeNs: number}} GetFileTimeResponse */
interface GetFileTimeResponse {
  mtimeS: number;
  mtimeNs: number;
}
/** @type {!PismoMethod} */
export const GetFileTime: PismoMethod = {
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
interface SetFileTimeParams {
  treename: string;
  relativePath: string;
  mtimeS: number;
  mtimeNs: number;
}
/** @typedef {void} SetFileTimeResponse */
type SetFileTimeResponse = void;
/** @type {!PismoMethod} */
export const SetFileTime: PismoMethod = {
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
interface GetFileParams {
  treename: string;
  relativePath: string;
}
/** @type {!PismoMethod} */
export const GetFile: PismoMethod = {
  id: 'get-file',
  requestSchema: {
    treename: 'string',
    relativePath: 'string'
  },
  responseSchema: null
};


/** @typedef {!{treename: string, relativePath: string, filesize: number}} PreparePutFileParams */
interface PreparePutFileParams {
  treename: string;
  relativePath: string;
  filesize: number;
}
/** @typedef {!{putId: string}} PreparePutFileResponse */
interface PreparePutFileResponse {
  putId: string;
}
/** @type {!PismoMethod} */
export const PreparePutFile: PismoMethod = {
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
interface CopyWithinParams {
  srcTreename: string;
  srcRelativePath: string;
  destTreename: string;
  destRelativePath: string;
}
/** @type {!PismoMethod} */
export const CopyWithin: PismoMethod = {
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
interface DeleteFileParams {
  treename: string;
  relativePath: string;
}
/** @type {!PismoMethod} */
export const DeleteFile: PismoMethod = {
  id: 'delete-file',
  requestSchema: {
    treename: 'string',
    relativePath: 'string'
  },
  responseSchema: null
};
