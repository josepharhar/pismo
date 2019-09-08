declare type JsonSchema = string | number | boolean | Array<any> | Object;
interface PismoMethod {
    id: string;
    requestSchema: JsonSchema;
    responseSchema: JsonSchema;
}
export declare const FileInfoSchema: JsonSchema;
export declare const TreeFileSchema: JsonSchema;
export declare const GetTrees: PismoMethod;
export declare const GetFileTime: PismoMethod;
export declare const SetFileTime: PismoMethod;
export declare const GetFile: PismoMethod;
export declare const PreparePutFile: PismoMethod;
export declare const CopyWithin: PismoMethod;
export declare const DeleteFile: PismoMethod;
export {};
