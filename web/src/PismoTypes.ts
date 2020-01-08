export interface FileInfo {
  path: string;
  mtimeS: number;
  mtimeNs: number;
  size: number;
  hash: string;
  customAttributeNameToValue: {[x: string]: string};
}

export function areFilesEqual(one: FileInfo, two: FileInfo): boolean {
  return one.path === two.path
    && one.mtimeS === two.mtimeS
    && one.mtimeNs === two.mtimeNs
    && one.size === two.size
    && one.hash === two.hash;
}

export interface TreeFile {
  path: string;
  lastUpdated: number;
  files: Array<FileInfo>;
  customAttributeNameToCommand: {[x: string]: string};
}

export interface Operation {
  operator: 'rm'|'cp'|'touch'|'mv';
  operands: Array<{
    tree: 'base'|'other';
    relativePath: string;
  }>;
}
export interface MergeFile {
  baseBranch: string;
  otherBranch: string;
  operations: Array<Operation>;
}

export const GetTrees = 'get-trees';
export interface GetTreesRequest {
  includeRemotes: boolean;
}
export interface GetTreesResponse {
  trees: Array<{
    treename: string;
    treefile: TreeFile;
  }>;
}

export const GetRemotes = 'get-remotes';
export interface GetRemotesResponse {
  remotes: Array<{
    name: string;
    url: string;
  }>;
}

export interface Request {};

export const DeleteTree = 'delete-tree';
export interface DeleteTreeRequest extends Request {
  treename: string;
}

export const UpdateTree = 'update-tree';
export interface UpdateTreeRequest {
  treename: string;
}