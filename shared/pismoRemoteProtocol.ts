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

export const FileInfoSchema: JsonSchema = {
  path: 'string',
  mtimeS: 'number',
  mtimeNs: 'number',
  size: 'number',
  hash: 'string'
};

export const TreeFileSchema: JsonSchema = {
  path: 'string',
  // lastUpdated can be -1 to signal that an update never happened
  lastUpdated: 'number',
  files: [FileInfoSchema]
};

type GetTreesRequest = void;
interface GetTreesResponse {
  trees: Array<{treename: string, treefile: TreeFile}>;
}
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

interface GetFileTimeParams {
  treename: string;
  relativePath: string;
}
interface GetFileTimeResponse {
  mtimeS: number;
  mtimeNs: number;
}
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

interface SetFileTimeParams {
  treename: string;
  relativePath: string;
  mtimeS: number;
  mtimeNs: number;
}
type SetFileTimeResponse = void;
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

interface GetFileParams {
  treename: string;
  relativePath: string;
}
export const GetFile: PismoMethod = {
  id: 'get-file',
  requestSchema: {
    treename: 'string',
    relativePath: 'string'
  },
  responseSchema: null
};

interface PreparePutFileParams {
  treename: string;
  relativePath: string;
  filesize: number;
}
interface PreparePutFileResponse {
  putId: string;
}
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

interface CopyWithinParams {
  srcTreename: string;
  srcRelativePath: string;
  destTreename: string;
  destRelativePath: string;
}
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

interface DeleteFileParams {
  treename: string;
  relativePath: string;
}
export const DeleteFile: PismoMethod = {
  id: 'delete-file',
  requestSchema: {
    treename: 'string',
    relativePath: 'string'
  },
  responseSchema: null
};
