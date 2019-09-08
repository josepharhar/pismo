"use strict";
var _a;
exports.__esModule = true;
exports.FileInfoSchema = {
    path: 'string',
    mtimeS: 'number',
    mtimeNs: 'number',
    size: 'number',
    hash: 'string'
};
exports.TreeFileSchema = {
    path: 'string',
    // lastUpdated can be -1 to signal that an update never happened
    lastUpdated: 'number',
    files: [exports.FileInfoSchema]
};
exports.GetTrees = {
    id: 'get-trees',
    requestSchema: null,
    responseSchema: {
        trees: [{
                treename: 'string',
                treefile: exports.TreeFileSchema
            }]
    }
};
exports.GetFileTime = {
    id: 'get-file-time',
    requestSchema: GetFileTimeParams
}, exports. = (_a = void 0, _a.treename), exports. = _a["string"], exports. = _a.relativePath, exports. = _a["string"];
;
exports.SetFileTime = {
    id: 'set-file-time',
    requestSchema: {
        treename: 'string',
        relativePath: 'string',
        mtimeS: 'number',
        mtimeNs: 'number'
    },
    responseSchema: null
};
exports.GetFile = {
    id: 'get-file',
    requestSchema: {
        treename: 'string',
        relativePath: 'string'
    },
    responseSchema: null
};
exports.PreparePutFile = {
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
exports.CopyWithin = {
    id: 'copy-within',
    requestSchema: {
        srcTreename: 'string',
        srcRelativePath: 'string',
        destTreename: 'string',
        destRelativePath: 'string'
    },
    responseSchema: null
};
exports.DeleteFile = {
    id: 'delete-file',
    requestSchema: {
        treename: 'string',
        relativePath: 'string'
    },
    responseSchema: null
};
