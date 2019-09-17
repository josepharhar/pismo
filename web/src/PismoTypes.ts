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

export interface GetTreesRequest {
  includeRemotes: boolean;
}
export interface GetTreesResponse {
  trees: Array<{
    treename: string;
    treefile: TreeFile;
  }>;
}