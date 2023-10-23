import {
    CompletionItem,
    CompletionItemKind,
    TextDocumentPositionParams,
    Position,
    InsertTextFormat,
    Hover,
    Definition,
    Location,
    Diagnostic,
    DiagnosticSeverity,
    Range,
    MarkupContent,
    MarkupKind,
} from 'vscode-languageserver/node';

import {
    TextDocument
} from 'vscode-languageserver-textdocument';

import { URI } from 'vscode-uri';

import { DEFAULT_WHITESPACES, LINEBREAKS, STOP_CHARS, varType, kwdNum, SkipComment, intersNum, OLC, MLC_O, MLC_C, DIGITS } from './enums';
import { ArrayClass, getDefaults, getCompletionInfoForArray } from './defaults'
import { getTree, validateTextDocument } from './server';
import { IImport, If_s, IArray, IRange, RslEntity, IToken } from './interfaces';
import { readFileSync, existsSync } from 'fs';
import { convertToRange, convertToIRange } from './utils';
import { fileURLToPath } from 'url';
import * as path from 'path';
import { searchMacrofile } from './macrosearch';
import { exit } from 'process';

class CArray implements IArray{
    _it:Array<string>;

    constructor(){ this._it = new Array()}

    is(it:string):If_s<number> {
        let res = this._it.indexOf(it.toLowerCase());
        return {first: res >= 0, second: res};
    }

    str(num:varType): string {return this._it[num];}
}

class CEnds extends CArray {
    constructor() {
        super();
        this._it[0] = "class";
        this._it[1] = "macro";
        this._it[2] = "if";
        this._it[3] = "for";
        this._it[4] = "while";
    }
}

class Ctypes extends CArray {
    constructor () {
        super();
        this._it[varType._variant]         = "variant";
        this._it[varType._integer]         = "integer";
        this._it[varType._double]          = "double";
        this._it[varType._doublel]         = "doublel";
        this._it[varType._string]          = "string";
        this._it[varType._bool]            = "bool";
        this._it[varType._date]            = "date";
        this._it[varType._time]            = "time";
        this._it[varType._datetime]        = "datetime";
        this._it[varType._memaddr]         = "memaddr";
        this._it[varType._procref]         = "procref";
        this._it[varType._methodref]       = "methodref";
        this._it[varType._decimal]         = "decimal";
        this._it[varType._numeric]         = "numeric";
        this._it[varType._money]           = "money";
        this._it[varType._moneyl]          = "moneyl";
        this._it[varType._specval]         = "specval";
    }
}

class Ckeywords extends CArray {
    constructor () {
        super();
        this._it[kwdNum._array]         = "array"
        this._it[kwdNum._end]           = "end"
        this._it[kwdNum._or]            = "or"
        this._it[kwdNum._break]         = "break"
        this._it[kwdNum._file]          = "file"
        this._it[kwdNum._private]       = "private"
        this._it[kwdNum._class]         = "class"
        this._it[kwdNum._for]           = "for"
        this._it[kwdNum._record]        = "record"
        this._it[kwdNum._const]         = "const"
        this._it[kwdNum._if]            = "if"
        this._it[kwdNum._return]        = "return"
        this._it[kwdNum._continue]      = "continue"
        this._it[kwdNum._import]        = "import"
        this._it[kwdNum._var]           = "var"
        this._it[kwdNum._cpdos]         = "cpdos"
        this._it[kwdNum._local]         = "local"
        this._it[kwdNum._while]         = "while"
        this._it[kwdNum._cpwin]         = "cpwin"
        this._it[kwdNum._macro]         = "macro"
        this._it[kwdNum._with]          = "with"
        this._it[kwdNum._elif]          = "elif"
        this._it[kwdNum._not]           = "not"
        this._it[kwdNum._else]          = "else"
        this._it[kwdNum._onerror]       = "onerror"
        this._it[kwdNum._olc]           = OLC;
        this._it[kwdNum._mlc_o]         = MLC_O;
        this._it[kwdNum._mlc_c]         = MLC_C;
    }
}

class Cstr_item_kind extends CArray {
    constructor () {
        super();
        this._it[CompletionItemKind.Text]          = "Текст";
        this._it[CompletionItemKind.Method]        = "Метод";
        this._it[CompletionItemKind.Function]      = "Функция";
        this._it[CompletionItemKind.Constructor]   = "Конструктор";
        this._it[CompletionItemKind.Field]         = "Поле";
        this._it[CompletionItemKind.Variable]      = "Переменная";
        this._it[CompletionItemKind.Class]         = "Класс";
        this._it[CompletionItemKind.Interface]     = "Интерфейс";
        this._it[CompletionItemKind.Module]        = "Модуль";
        this._it[CompletionItemKind.Property]      = "Свойство";
        this._it[CompletionItemKind.Unit]          = "Unit";
        this._it[CompletionItemKind.Value]         = "Значение";
        this._it[CompletionItemKind.Enum]          = "Перечисление";
        this._it[CompletionItemKind.Keyword]       = "Ключевое слово";
        this._it[CompletionItemKind.Snippet]       = "Сниппет";
        this._it[CompletionItemKind.Color]         = "Цвет";
        this._it[CompletionItemKind.File]          = "Файл";
        this._it[CompletionItemKind.Reference]     = "Ссылка";
        this._it[CompletionItemKind.Folder]        = "Папка";
        this._it[CompletionItemKind.EnumMember]    = "Член перечисления";
        this._it[CompletionItemKind.Constant]      = "Константа";
        this._it[CompletionItemKind.Struct]        = "Структура";
        this._it[CompletionItemKind.Event]         = "Событие";
        this._it[CompletionItemKind.Operator]      = "Оператор";
        this._it[CompletionItemKind.TypeParameter] = "Тип параметра";
    }
}


 /** Возвращает строковое значение типа объекта*/
function getStrItemKind(kind: number): string { return STR_ITEM_KIND.str(kind); }

 /** Возвращает строковое значение типа переменной*/
function getTypeStr(typeNum:varType): string { return TYPES.str(typeNum); }

let tokensWithEnd:CEnds = new CEnds();
let TYPES:Ctypes = new Ctypes();
let KEYWORDS:Ckeywords = new Ckeywords();
let STR_ITEM_KIND:Cstr_item_kind = new Cstr_item_kind();

export class CVar extends RslEntity {
    private value: string;

    constructor(textDocument: TextDocument, name: string, range: Range, privateFlag: boolean, isConstant: boolean, isProperty: boolean, type: string) {
        super(textDocument);
        this.value = "";
        this.name = name;
        this.range = convertToIRange(textDocument, range);
        this.setType(type);
        this.isPrivate = privateFlag;
        this.objKind = isProperty ? CompletionItemKind.Property : (isConstant ? CompletionItemKind.Constant : CompletionItemKind.Variable);
        this.insertedText = name;
    }
    setValue(value: string) : void {this.value = value;}
    updateCompletionInfo(): void {
        if (this.objKind == CompletionItemKind.Constant) {
            this.detail = 'const ';
        } else {
            this.detail = `${getStrItemKind(this.objKind)}: `
        }
        this.detail += this.name;
        if (this.varType_) {
            this.detail += `: ${this.varType_}`;
        }
        if (this.value.length > 0) this.detail += ` = ${this.value}`;
    }
    isActual(pos: number)   : boolean { return (this.range.end < pos) }
    reParse()             : void {}
}
/** Родительский класс для файлов, макросов и классов*/
export class RslEntityWithBody extends RslEntity {
    protected children: Array<RslEntity>;
    protected paramStr: string;
    /** Номер символа от начала файла */
    protected offset: number;
    protected savedPos: number;
    protected diagnostics: Array<Diagnostic>;

    constructor(textDocument: TextDocument, range: Range, objKind:CompletionItemKind = CompletionItemKind.Unit, diagnostics: Array<Diagnostic> = []) {
        super(textDocument);
        this.range = convertToIRange(textDocument, range);
        this.children = new Array();
        this.textDocument = textDocument;
        this.paramStr = "";
        this.savedPos = 0;
        this.offset = this.textDocument.offsetAt(range.start);
        this.objKind = objKind;
        this.diagnostics = diagnostics;
        this.parseBody();
    }

    updateCompletionInfo(): void {}

    isActual(pos: number): boolean {
        return (this.range.start < pos && pos < this.range.end);
    }

    RecursiveFind(name: string): RslEntity {
        let Obj: RslEntity = undefined;
        for (const iterator of this.children) {
            if (iterator.Name.toLowerCase() == name.toLowerCase()) Obj = iterator;
            else if (Obj == undefined) Obj = iterator.RecursiveFind(name);
            if (Obj != undefined) break;
        }
        return Obj;
    }

    reParse() {
        this.offset = 0;
        this.parseBody();
    }
    getChildren() { return this.children; }
    addChild(node: RslEntity) {
        this.children.push(node);
    }
    addChildren(children: Array<RslEntity>) {
        this.children = this.children.concat(children);
    }
    setType(type: string) { this.varType_ = type }

    ProcessImportNames(): Range[] {
        let names: Range[] = [];
        let token: IToken;
        let delimiter: IToken;
        do {
            token = this.NextToken();
            names.push(convertToRange(this.textDocument, token.range));
            delimiter = this.NextToken();
        } while (delimiter.str != ';');
        return names;
    }

    getActualChilds(position: number):Array<RslEntity> {
        let answer: Array<RslEntity> = new Array();
        if (position != 0) //Ищем в текущем файле
        {
            this.children.forEach(parent => {
                if (parent.Range.start < position) {
                    answer.push(parent);
                }
                if (parent.isActual(position)) //пробуем взять только актуальные
                {
                    if (parent instanceof RslEntityWithBody)
                    {
                        parent.children.forEach(child => {
                            answer.push(child);
                        })
                    }
                }
            });
        }
        else //ищем в другом файле, надо выдать все не приватные элементы
        {
            this.children.forEach(parent => {
                if (!parent.Private)
                    answer.push(parent);
            });
        }
        return answer;
    }

    getCurrentToken(offset: number, savePosition: boolean = true): IToken {
        let res: IToken = undefined;
        if (offset > 0) {
            this.SavePos();
            this.offset = offset;
            if (this.IsStopChar()) {
                this.offset--;
            }
            if (!DEFAULT_WHITESPACES.includes(this.CurrentChar)) {
                if (this.CurrentChar === ".") this.offset--;
                while (!this.IsStopChar() && this.CurrentChar != undefined) {
                    this.offset--;
                }
                if (this.IsStopChar()) this.Next();
                res = this.NextToken();
            }
            if (savePosition) this.RestorePos();
        }
        return res;
    }

    ChildsCompletionInfo(isCheckPrivate: boolean = false, position: number = 0, isCheckActual: boolean = false): Array<CompletionItem> {
        let answer: Array<CompletionItem> = new Array();
        this.children.forEach(child => {
            if (isCheckActual) {
                if (child.Range.end < position) {
                    if (isCheckPrivate) {
                        if (!child.Private) answer.push(child.CompletionInfo);
                    }
                    else answer.push(child.CompletionInfo);
                }
                else if (child.isActual(position)) {
                    let completions = child.ChildsCompletionInfo();
                    completions.forEach(completion => {
                        answer.push(completion);
                    });
                }
            } else {
                if (isCheckPrivate) {
                    if (!child.Private) answer.push(child.CompletionInfo);
                } else {
                    answer.push(child.CompletionInfo);
                }
            }
        });
        if (this.ObjKind === CompletionItemKind.Class){
            let cast: CClass = <CClass>(<unknown>this); //пытаюсь преобразовать из базового типа в тот который должен быть
            let parent:RslEntity;
            if (cast.getParentName().length)
            {
                for (const iterator of getTree())
                {
                    parent = iterator.object.RecursiveFind(cast.getParentName());
                    if (parent != undefined) break;
                }
                if (parent != undefined)
                {
                    parent.getChildren().forEach(child=>{
                        if (!child.Private)
                            answer.push(child.CompletionInfo);
                    });
                }
            }
        }
        return answer;
    }
    protected     getKeywordNum(token: string): If_s<number> { return KEYWORDS.is(token.toLowerCase()); }

    protected charAt(index: number): string {
        if (index + 1 >= this.range.end) {
            return "";
        }
        let range = {start: this.textDocument.positionAt(index), end: this.textDocument.positionAt(index+1)};
        return this.textDocument.getText(range);
    }

    protected get line(): number { return this.textDocument.positionAt(this.offset).line; }
    protected get CurrentChar()               : string    { return this.charAt(this.offset); }
    protected get Pos()                       : number    { return this.offset; }
    protected get End()                       : boolean   { return this.CurrentChar == ""; }
    protected     Next()                      : void      { if (!this.End) this.offset++; }
    protected     Skip()                      : void      { while (DEFAULT_WHITESPACES.includes(this.CurrentChar) && !this.End) this.Next(); }
    protected     IsStopChar()                : boolean   { return STOP_CHARS.includes(this.CurrentChar); }
    protected     RestorePos()                : void      {this.offset = this.savedPos}
    protected     SavePos()                   : void      {this.savedPos = this.offset}
    protected     getObjectBodyRange(): Range {
        let token: string;
        let savePos: number = this.Pos;
        let indent: number = 1;
        while (indent !== 0 && !this.End) {
            token = this.NextToken().str;
            if (tokensWithEnd.is(token).first) {
                indent++;
            }
            else if (token.toLowerCase() == "end") {
                indent--;
            }
        }
        let range: Range = {start: this.textDocument.positionAt(savePos), end: this.textDocument.positionAt(this.Pos)};
        return range;
    }
    protected     NextToken(skipComment: SkipComment = SkipComment.yes): IToken {
        this.Skip();
        let savedPosition:number = this.Pos;
        let token: string = "";
        if (!this.IsStopChar()) {
            if (this.CurrentChar == "\"") {
                let stop: boolean = false;
                token = token + this.CurrentChar;
                this.Next();

                while (!stop && !this.End) {
                    stop = (this.CurrentChar == "\"" && this.charAt(this.offset - 1) != "\\") ? true : false;
                    token = token + this.CurrentChar;
                    this.Next();
                }
            }
            else {
                while (!this.IsToken(token) && !this.End) {
                    token = token + this.CurrentChar;
                    this.Next();
                }
            }
            if (skipComment == SkipComment.yes) {
                if (token == OLC) {
                    this.SkipToEndComment(true);
                    savedPosition = this.Pos;
                    token = this.NextToken(skipComment).str;
                }
                else if (token == MLC_O) {
                    this.SkipToEndComment();
                    savedPosition = this.Pos;
                    token = this.NextToken(skipComment).str;
                }
            }
        }
        else {
            token = this.CurrentChar;
            this.Next();
        }
        let range :IRange = {start: savedPosition, end: savedPosition + token.length};
        let answer:IToken = {str: token, range};
        return answer;
    }
    protected     IsToken(chr: string)        : boolean   {
        let answer: If_s<number> = {first: false, second: 0};
        if (chr != "") {
            answer = KEYWORDS.is(chr.toLowerCase());
            if (answer.first && answer.second != kwdNum._olc && answer.second != kwdNum._mlc_o && answer.second != kwdNum._mlc_c) {
                answer.first = this.IsStopChar();
            }
            else if (!answer.first && this.IsStopChar()) {
                answer.first = true;
            }
        }
        return answer.first;
    }
    protected CreateRecord(isPrivate: boolean = false, isConstant: boolean = false) {
        let name = this.NextToken();
        let record = new CVar(this.textDocument, name.str, convertToRange(this.textDocument, name.range), isPrivate, isConstant, false, "record");
        this.addChild(record);
    }
    protected parseVariable(isPrivate: boolean, isConstant: boolean = false) {
        let token: IToken = this.NextToken();
        let varObject: CVar = new CVar(this.textDocument, token.str, convertToRange(this.textDocument, token.range), isPrivate, isConstant, this.ObjKind === CompletionItemKind.Class, '');
        token = this.NextToken();
        let stop: boolean = false;
        let comment: string = "";
        let varTypeStr: string = "";
        while (!stop && !this.End) {
            switch (token.str) {
                case "(":
                case ")": { stop = true; } break;
                case OLC:
                case MLC_O: {
                    comment = (token.str == OLC) ? this.GetOLC() : this.GetMLC();
                    varObject.Description(comment);
                } break;
                case "=":
                case ":": {
                    varTypeStr = this.NextToken().str;
                    if (token.str == "=") varObject.setValue(varTypeStr);
                    if (varObject.Type === getTypeStr(varType._variant)) {
                        let varTypeTouple: If_s<string> = this.GetDataType(varTypeStr);
                        if (varTypeTouple.first) {
                            varObject.setType(varTypeTouple.second);
                        }
                    }
                } break;
                case ",":
                case ";": {
                    let sToken = token.str;
                    this.SavePos();
                    token = this.NextToken(SkipComment.no);
                    if (token.str != OLC && token.str != MLC_O) this.RestorePos();
                    else {
                        comment = (token.str == OLC) ? this.GetOLC() : this.GetMLC();
                        varObject.Description(comment);
                    }
                    if (sToken == ",") this.parseVariable(isPrivate, isConstant);
                    if (sToken == ";") stop = true;
                } break;
            }
            if (!stop) token = this.NextToken();
        }
        this.addChild(varObject);
    }
    protected     GetOLC()                    : string 	{
        let comment: string = "";
        while (!LINEBREAKS.includes(this.CurrentChar) && !this.End) {
            comment += this.CurrentChar;
            this.Next();
        }
        return comment.trim();
    }
    protected     GetMLC()                    : string 	{
        let comment: string = "";
        while (!((this.CurrentChar == "*") && (this.charAt(this.Pos + 1) == "/")) && !this.End) {
            comment += this.CurrentChar;
            this.Next();
        }
        this.Next(); this.Next();
        return comment;
    }
    protected     SkipToEndComment(isOLC:boolean = false): void {
        if (isOLC) {
            this.GetOLC();
        } else {
            this.GetMLC();
            this.Next(); this.Next(); //пропустить закрывающий символ "/*"
        }
        this.Skip();
    }
    protected     GetDataType(token: string)        : If_s<string> {
        token = token.toLowerCase();
        if (token[0] == "@") token = token.substring(1, token.length); //если это какой-то указатель - обрежем собаку

        let answer: If_s<string> = {first: false, second: getTypeStr(varType._variant)};
        let tmp = TYPES.is(token);
        let isType: boolean = tmp.first,
            typeNum: number = tmp.second;

        if (!isType) { //не нашли в стандартных типах
            if (token[0] == "\"" || token[0] == "\'") {//это строка
                answer.first = true;
                answer.second = getTypeStr(varType._string);
            }
            else if (DIGITS.includes(token[0])) {//это число
                answer.first = true;
                answer.second = getTypeStr(varType._integer);
            }
            else if (token.toLowerCase() == "true" || token.toLowerCase() == "false") {//это булево
                answer.first = true;
                answer.second = getTypeStr(varType._bool);
            }
            else {//надо поискать в именах объявленных и импортированных классов и функций FIXME: переделать
                let baseObject: Array<IImport> = getTree();
                let obj: RslEntity;
                if (baseObject != undefined) {
                    for (const iterator of baseObject) {
                        obj = iterator.object.RecursiveFind(token); //FIXME: убрать рекурсивный поиск
                        if (obj != undefined) break;
                    }
                }
                if (obj != undefined) {                      //ищем в текущем файле и всех импортированных
                    answer.first = true;
                    answer.second = obj.Type;
                }
                else {                                       //иначе ищем в остальных местах
                    let DefArray: ArrayClass = getDefaults();
                    let ans = DefArray.find(token);          //поиск в дефолтах
                    if (ans != undefined) {
                        answer.first = true;
                        answer.second = ans.returnType();
                    }
                }
            }
        }
        else {answer.first = true; answer.second = getTypeStr(typeNum);}
        return answer;
    }
    // start after opening parenthesis
    protected parseArgs(): Array<CVar> {
        if (this.charAt(this.offset - 1) != "(") {
            console.warn(this.textDocument.uri.valueOf() + ":" + (this.textDocument.positionAt(this.Pos).line + 1) + " parseArgs called not on '('!");
            return [];
        }
        let args: Array<CVar> = [];
        let token: IToken = this.NextToken();
        while (token.str !== ')') {
            let range = convertToRange(this.textDocument, token.range);
            let name = token.str;
            let type = 'variant';
            token = this.NextToken();
            if (token.str === ':') {
                token = this.NextToken();
                if (token.str !== ')') { // in case we're typing
                    type = token.str;
                    token = this.NextToken();
                }
            }
            args.push(new CVar(this.textDocument, name, range, true, false, false, type));
            if (token.str === ',') {
                token = this.NextToken();
            }
        }
        return args;
    }
    protected parseMacro(isPrivate: boolean): void {
        let isMethod = (this.ObjKind == CompletionItemKind.Class);
        let name: IToken = this.NextToken();
        let args: Array<CVar> = [];
        let token = this.NextToken();
        if (token.str == '(') {
            args = this.parseArgs();
        }
        let returnType = 'variant';
        if (this.NextToken().str == ':') {
            returnType = this.NextToken().str;
        }
        let bodyRange = this.getObjectBodyRange();
        let range: Range = {
            start: this.textDocument.positionAt(name.range.start),
            end: bodyRange.end
        };
        let macro: CMacro = new CMacro(this.textDocument, range, name.str, args, returnType, isPrivate, isMethod);
        this.addChild(macro);
    }
    protected parseClass(isPrivate: boolean): void {
        let parentName: string = "";
        let name: IToken = this.NextToken();
        if (name.str == "(") {
            parentName = this.NextToken().str; //это имя родительского класса
            this.Next();
            name = this.NextToken();
        }
        let token = this.NextToken();
        let args: Array<CVar> = [];
        if (token.str == "(") { // class constructor has args
            args = this.parseArgs();
        }
        let range: Range = {
            start: this.textDocument.positionAt(name.range.start),
            end: this.getObjectBodyRange().end
        };
        let classObj: CClass = new CClass(this.textDocument, range, name.str, parentName, args, isPrivate);
        this.addChild(classObj);
    }
    protected     CreateImport(): void {
        let nameRanges: Range[] = this.ProcessImportNames();
        nameRanges.forEach(nameRange => {
            let nameInter = this.textDocument.getText(nameRange);
            //запросим открытие такого файла
            let currentFileDir = path.dirname(fileURLToPath(this.textDocument.uri));
            if (nameInter.startsWith('"') && nameInter.endsWith('"')) {
                nameInter = nameInter.substring(1, nameInter.length - 1);
            }

            let fullpath = searchMacrofile(currentFileDir, nameInter);
            if (!existsSync(fullpath)) {
                let importError: Diagnostic = {
                    severity: DiagnosticSeverity.Error,
                    range: nameRange,
                    message: `Cannot find file "${nameInter}"`,
                    source: 'RSL parser'
                };
                this.diagnostics.push(importError);
                return;
            };
            if (fullpath.endsWith('.d32')) return;
            let text = readFileSync(fullpath).toString();
            let uri = URI.file(path.resolve(fullpath)).toString();
            let textDocument = TextDocument.create(uri, 'rsl', 0, text);
            validateTextDocument(textDocument);
        });
    }
    protected parseFor(): void {
        // TODO: create an object for the code block (like for and while)
        let token = this.NextToken();
        if (token.str !== '(') { return; }
        token = this.NextToken();
        if (token.str.toLowerCase() === 'var') {
            let name = this.NextToken();
            token = this.NextToken();
            let type = 'variant';
            if (token.str === ':') {
                token = this.NextToken();
                type = token.str;
            }
            this.addChild(new CVar(this.textDocument, name.str, convertToRange(this.textDocument, name.range), false, false, false, type));
        }
        while (token.str !== ')') {
            token = this.NextToken();
        }
    }
    protected parseBody(): void {
        if (this.range.start === 0 && this.range.end === 0) {
            this.range = {start: 0, end: this.textDocument.getText().length};
        }
        this.offset = this.range.start;
        this.Skip();
        let curToken: string;

        while (!this.End) {
            curToken = this.NextToken().str;
            let actionTuple = this.getKeywordNum(curToken);
            if (actionTuple.first) {
                switch (actionTuple.second) {
                    case kwdNum._local:
                    case kwdNum._private:
                        {
                            curToken = this.NextToken().str;
                            let tmp = this.getKeywordNum(curToken);
                            if (tmp.first) {
                                switch (tmp.second) {
                                    case kwdNum._const: this.parseVariable(true, true); break;
                                    case kwdNum._var  : this.parseVariable(true); break;
                                    case kwdNum._record: this.CreateRecord(true); break;
                                    case kwdNum._macro: this.parseMacro(true); break;
                                    case kwdNum._class: this.parseClass(true); break;
                                    default: break;
                                }
                            }
                        } break;
                    case kwdNum._const : this.parseVariable(false, true); break;
                    case kwdNum._var   : this.parseVariable(false); break;
                    case kwdNum._record: this.CreateRecord(false); break;
                    case kwdNum._macro : this.parseMacro(false); break;
                    case kwdNum._import: this.CreateImport(); break;
                    case kwdNum._class : this.parseClass(false); break;
                    case kwdNum._for: this.parseFor(); break;
                    default: break;
                }
            }
        }
    }
}

/** Базовый класс для макросов*/
class CMacro extends RslEntityWithBody {
    protected returnType: string;
    protected args: Array<CVar>;

    constructor(textDocument: TextDocument, range: Range, name: string, args: Array<CVar>, returnType: string, isPrivate: boolean, isMethod: boolean) {
        super(textDocument, range, isMethod ? CompletionItemKind.Method : CompletionItemKind.Function);
        this.name = name;
        this.setType(returnType);
        this.args = args;
        this.isPrivate = isPrivate;
        this.range = convertToIRange(textDocument, range);
        this.insertedText = `${name}()`;
        this.addChildren(args);
    }
    updateCompletionInfo(): void {
        this.detail = getStrItemKind(this.objKind);
        this.description.value =
            "\n```rsl\n"
            + `macro ${this.name}(` + this.args.map(arg => {return arg.Name + (arg.Type ? (': ' + arg.Type) : '')}).join(', ') + `): ${this.Type}`
            + "\n```\n"
        ;
    }
}
/** Базовый класс для классов*/
class CClass extends RslEntityWithBody {
    private parentName:string;

    constructor(textDocument: TextDocument, range: Range, name:string, parentName:string, args:Array<RslEntity>, privateFlag:boolean){
        super(textDocument, range, CompletionItemKind.Class);
        this.name = name;
        this.parentName = parentName;
        this.isPrivate = privateFlag;
        this.insertedText = name;
        this.varType_ = name;
        this.range = convertToIRange(textDocument, range);
        if (parentName.length > 0) {
            //TODO: подгрузить методы и свойства родительского класса
        }
        this.addChildren(args);
    }
    getParentName():string {return this.parentName;}

    updateCompletionInfo():void {
        this.detail = `${getStrItemKind(this.objKind)}: ` + this.name;
    }
}

