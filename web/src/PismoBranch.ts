export class PismoBranch {
  _rawString: string;
  _remote?: string;
  _name: string;

  constructor(string: string) {
    if ((string.match(/\//g) || []).length > 1)
      throw new Error(`More than one '/' in branch string: ${string}`);

    let remote = undefined, name = null;
    if (string.includes('/')) {
      [remote, name] = string.split('/');
    } else {
      name = string;
    }
    if (!name)
      throw new Error(`Failed to parse branch string: ${string}`);

    this._rawString = string;
    this._remote = remote;
    this._name = name;
  }

  remote(): string|undefined {
    return this._remote;
  }

  name(): string {
    return this._name;
  }

  rawString(): string {
    return this._rawString;
  }
}
