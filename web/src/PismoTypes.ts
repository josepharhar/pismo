export interface FileInfo {
  path: string;
  mtimeS: number;
  mtimeNs: number;
  size: number;
  hash: string;
  customAttributeNameToValue: object;
}

export interface TreeFile {
  path: string;
  lastUpdated: number;
  files: Array<FileInfo>;
  customAttributeNameToCommand: object;
}

export interface Operation {
  operator: 'rm'|'cp'|'touch';
  operands: Array<{
    tree: 'base'|'other';
    relativePath: string;
  }>;
}
export interface MergeFile {
  baseBranch: string;
  otherBranch: string;
  operation: Array<Operation>;
}

export interface GetTreesRequest {
  includeRemotes: boolean;
}
export interface GetTreesResponse {
  trees: Array<{
    treename: string;
    treefile: TreeFile;
  }>;
}