import { URI } from "vscode-uri";

export class URIUppercaseDriveLetter extends URI {
    private static enableUppercase: boolean = false;
    constructor(scheme, authority?, path?, query?, fragment?, _strict?) {
        super(scheme, authority, path, query, fragment, _strict);
    }
    toString(skipEncoding?: boolean | undefined): string {
        let s = super.toString(skipEncoding);
        if (URIUppercaseDriveLetter.enableUppercase && s.match(/^file:\/\/\/[a-z]:/)) {
            s = s.substring(0, 8) + s[8].toUpperCase() + s.substring(9);
        }
        return s;
    }
    static file(path: string): URIUppercaseDriveLetter {
        let u = super.file(path);
        return new URIUppercaseDriveLetter(u);
    };
    static parse(value: string, _strict?: boolean): URIUppercaseDriveLetter {
        let u = super.parse(value, _strict);
        return new URIUppercaseDriveLetter(u);
    };
    static enableUppercaseDriveLetters(enable: boolean) {
        this.enableUppercase = enable;
    }
}
