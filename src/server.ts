import {
    CompletionItem,
    CompletionItemKind,
    createConnection,
    Definition,
    Diagnostic,
    DiagnosticSeverity,
    DiagnosticTag,
    DidChangeConfigurationNotification,
    Hover,
    InitializeParams,
    Location,
    MarkupContent,
    MarkupKind,
    Position,
    ProposedFeatures,
    Range,
    TextDocumentPositionParams,
    TextDocuments,
    TextDocumentSyncKind,
} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';

import { RslEntity, IImport, IRslSettings, IToken} from  './interfaces';
import { getDefaults, getCompletionInfoForArray } from './defaults';

import { RslEntityWithBody } from './common';
import { getSymbols } from './docsymbols';

const connection: ProposedFeatures.Connection = createConnection(ProposedFeatures.all);
let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
let hasConfigurationCapability  : boolean       = false;
let hasWorkspaceFolderCapability: boolean       = false;
let hasDiagnosticRelatedInformationCapability   = false;
let workFolderOpened            : boolean       = false;
const defaultSettings           : IRslSettings  = { import: true};
let globalSettings              : IRslSettings  = defaultSettings;
let documentSettings            : Map<string, Thenable<IRslSettings>> = new Map();
let Imports                     : Array<IImport>;

export function getTree():Array<IImport> {return Imports}

function getCurDoc(uri:string):TextDocument {
    let curDocArr = Imports.filter((value)=>{
        return value.uri == uri;
    });
    return curDocArr.pop().object.getTextDocument();
}

function getCurObj(uri: string): RslEntityWithBody {
  return Imports.find(m => m.uri === uri)?.object;
}

function FindObject(tdpp: TextDocumentPositionParams): RslEntity {
    let uri = tdpp.textDocument.uri;
    let foundObject: RslEntity = undefined;
    let token: IToken = undefined;
    let document: TextDocument = getCurDoc(tdpp.textDocument.uri);
    let tree: RslEntityWithBody = getCurObj(tdpp.textDocument.uri);
    if (tree === undefined) {
        return undefined;
    }
    let curOffset = document.offsetAt(tdpp.position);
    token = tree.getCurrentToken(curOffset);
    if (token === undefined) {
        return undefined;
    }
    let objArr = tree.getActualChilds(curOffset);
    let objects: Array<RslEntity> = new Array();
    for (const element of objArr) {
        if (element.canHaveChildren()) {
            element.getChildren().forEach(child=>{
                if (child.Name === token.str) objects.push(child);
            });
        }
        if (element.Name.toLowerCase() === token.str.toLowerCase()) {
            objects.push(element);
        }
    }
    if (objects.length > 1) {
        let minDistanse:number = token.range.start;
        for (const iterator of objects)
        {
            let curDistanse:number = token.range.start - iterator.Range.end;
            if (curDistanse < minDistanse)
            {
                foundObject = iterator;
                minDistanse = curDistanse;
            }
        }
    }
    else if (objects.length == 1)
    {
        foundObject = objects.pop();
    }

    if (foundObject == undefined)
    {
        for (const iterator of Imports) {
            if (iterator.uri != tdpp.textDocument.uri) {
                let objArr = iterator.object.getActualChilds(0);
                for (const element of objArr) {
                    if (element.Name === token.str) {
                        foundObject = element;
                        uri = iterator.uri;
                        break;
                    }
                }
            }
            if (foundObject != undefined) break;
        }
    }
    return foundObject;
}

connection.onInitialize((params: InitializeParams) => {
    let capabilities = params.capabilities;
    workFolderOpened = (params.rootPath != null)? true: false;

    hasConfigurationCapability = !!(capabilities.workspace && !!capabilities.workspace.configuration);
    hasWorkspaceFolderCapability = !!(capabilities.workspace && !!capabilities.workspace.workspaceFolders);
    hasDiagnosticRelatedInformationCapability =
        !!(capabilities.textDocument &&
        capabilities.textDocument.publishDiagnostics &&
        capabilities.textDocument.publishDiagnostics.relatedInformation);
    return {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            // Включим поддержку автодополнения
            completionProvider: {
                resolveProvider: true,
                "triggerCharacters": [ '.' ]
            },
            // Включим поддержку подсказок при наведении
            hoverProvider: true,
            // Включим поддержку перехода к определению (F12)
            definitionProvider: true,
            documentSymbolProvider: true
        }
    };
});

connection.onInitialized(() => {
    Imports   = new Array();

    if (!workFolderOpened) connection.sendNotification("noRootFolder"); //не открыта папка, надо ругнуться
    if (hasConfigurationCapability) {
        connection.client.register(
            DidChangeConfigurationNotification.type,
            undefined
        );
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders(_event => {
            connection.console.log('Workspace folder change event received.');
        });
    }

    connection.onRequest("getMacros", () => {
        let result:string[] = [];
        Imports.forEach(element=>{
            result.push(element.uri);
        });
        return result;
    } );
});

connection.onDidChangeConfiguration(change => {
    if (hasConfigurationCapability) {
        documentSettings.clear();
    } else {
        globalSettings = <IRslSettings>(
            (change.settings.RSLanguageServer || defaultSettings)
        );
    }

    documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<IRslSettings> {
    if (!hasConfigurationCapability) {
        return Promise.resolve(globalSettings);
    }
    let result = documentSettings.get(resource);
    if (!result) {
        result = connection.workspace.getConfiguration({
            scopeUri: resource,
            section: 'RSLanguageServer'
        });
        documentSettings.set(resource, result);
    }
    return result;
}

documents.onDidClose(e => {
    documentSettings.delete(e.document.uri);
});

documents.onDidChangeContent(change => {
    validateTextDocument(change.document);
});

export async function validateTextDocument(textDocument: TextDocument): Promise<void> {
    globalSettings = await getDocumentSettings(textDocument.uri);
    let text = textDocument.getText();

    let diagnostics: Diagnostic[] = [];
    const module = Imports.find(m => m.uri === textDocument.uri);
    let range: Range = { start: textDocument.positionAt(0), end: {line: textDocument.lineCount + 1, character: 0 }};
    if (module) {
        module.object = new RslEntityWithBody(textDocument, range, CompletionItemKind.Unit, diagnostics);
    } else {
        Imports.push({ uri: textDocument.uri, object: new RslEntityWithBody(textDocument, range, CompletionItemKind.Unit, diagnostics) });
    }


    let pattern = /\b(record|array)\b/gi;
    let m: RegExpExecArray | null;

    while (m = pattern.exec(text)) {
        let diagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Information,
            range: {
                start: textDocument.positionAt(m.index),
                end: textDocument.positionAt(m.index + m[0].length)
            },
            message: `Определение ${m[0].toUpperCase()} устарело, от такого надо избавляться по возможности.\nRecord → TRecHandler\nArray → TArray`,
            source: 'RSL parser',
            tags: [ DiagnosticTag.Deprecated ],
        };
        //добавляет дополнительную информацию к выводу проблемы
        if (hasDiagnosticRelatedInformationCapability) {
            diagnostic.relatedInformation = [
                {
                    location: {
                        uri: textDocument.uri,
                        range: Object.assign({}, diagnostic.range)
                    },
                    message: 'непонятная надпись'
                }
            ];
        }
        diagnostics.push(diagnostic);
    }

    // Send the computed diagnostics to VSCode.
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles(_change => {
    connection.console.log('We received an file change event');
});

function isCommentOrString(tdpp: TextDocumentPositionParams):boolean
{
    let document: TextDocument = getCurDoc(tdpp.textDocument.uri);
    let text: string = document.getText();
    let patterns = [];
    patterns.push(/(\/\/)(.+?)(?=[\n\r])/g);//однострочный комментарий
    patterns.push(/\/\*[^*]*(?:[^/*][^*]*)*\*\//g); //многострочный комментарий
    // patterns.push(/\/\*[\s\S]*\*\//g); //многострочный комментарий
    patterns.push(/\"(\\.|[^\"])*\"/g); //строка
    // patterns.push(/\'(\\.|[^\'])*\'/g); //строка //хз, с этим зависает

    let m: RegExpExecArray | null;

    for (const pattern of patterns) {
        while ((m = pattern.exec(text))) {
            let offset = document.offsetAt(tdpp.position);
            if (offset >= m.index && offset <= m.index + m[0].length) {
                return true;
            }
        }
    }
    return false;
}

connection.onCompletion((tdpp: TextDocumentPositionParams): CompletionItem[] => {
    let CompletionItemArray : Array<CompletionItem>  = new Array();
    let document            : TextDocument           = getCurDoc(tdpp.textDocument.uri);
    let obj                 : RslEntity               = FindObject(tdpp);
    let curPos = document.offsetAt(tdpp.position);

    if (!isCommentOrString(tdpp))
    {
        if (obj != undefined) {     //нашли эту переменную
            if (obj.Type !== "variant") {
                let objClass: RslEntity;
                for (const iterator of Imports) {
                    let objArr = iterator.object.getActualChilds(iterator.uri == tdpp.textDocument.uri? curPos: 0);
                    for (const objIter of objArr)
                    {
                        if (objIter.Name == obj.Type)
                        {
                            objClass = objIter;
                            break;
                        }
                    }
                    if (objClass != undefined) break;
                }
                if (objClass != undefined){
                    CompletionItemArray = objClass.ChildsCompletionInfo(true); //получим всю информацию о детях
                } else {
                    // Searching in predefined defaults
                    for (const defType of getDefaults().getChilds()) {
                        if (obj.Type == defType.returnType()) {
                            return defType.ChildsCompletionInfo();
                        }
                    };
                }
            }
        }
        else
        {
            Imports.forEach(element => {
                    let actualChilds = element.object.getActualChilds(element.uri == tdpp.textDocument.uri? curPos: 0);
                    for (const child of actualChilds) {
                        CompletionItemArray.push(child.CompletionInfo);
                    }
            });
            CompletionItemArray = CompletionItemArray.concat(getCompletionInfoForArray(getDefaults())); //все дефолтные классы, функции и переменные
        }
    }
    return CompletionItemArray;
});

connection.onCompletionResolve((item: CompletionItem): CompletionItem => {return item;});

connection.onHover((tdpp: TextDocumentPositionParams): Hover => {
    let hover: Hover =  undefined;
    if (!isCommentOrString(tdpp))
    {
        let document: TextDocument = getCurDoc(tdpp.textDocument.uri);
        let obj: RslEntity = FindObject(tdpp);
        let token: IToken = getCurObj(tdpp.textDocument.uri).getCurrentToken(document.offsetAt(tdpp.position));
        if (obj != undefined) {
            let completionInfo = obj.CompletionInfo;
            let contents: MarkupContent = {kind: MarkupKind.Markdown, value: completionInfo.detail};
            if (typeof completionInfo.documentation === 'object') {
                contents.value += completionInfo.documentation.value;
            } else {
                contents.value += completionInfo.documentation;
            }
            hover = {
                contents: contents,
                range : { start: document.positionAt(token.range.start),
                          end  : document.positionAt(token.range.end) }
            }
        } else {
            return {contents: "Token '" + token.str + "' not found", range: {start: tdpp.position, end: tdpp.position}};
        }
    } else {
        return {contents: "This is comment", range: {start: tdpp.position, end: tdpp.position}};
    }

    return hover != undefined? hover: null;
});


connection.onDefinition((tdpp: TextDocumentPositionParams) => {
    let obj: RslEntity = FindObject(tdpp);
    let result: Definition = undefined;
    if (!isCommentOrString(tdpp))
    {
        if (obj != undefined) {
            let document: TextDocument = getCurDoc(obj.getTextDocument().uri);
            if (document === undefined) return null;
            let range = obj.Range;
            let startPos: Position = document.positionAt(range.start);
            let endPos  : Position = document.positionAt(range.start + obj.Name.length);
            result = Location.create(obj.getTextDocument().uri, {
                start: startPos,
                end  : endPos
            })
        }
    }
    return (result !== undefined)? result: null;
});

function refreshModule(textDocument: TextDocument) {
  const { uri } = textDocument;
  let range: Range = { start: textDocument.positionAt(0), end: {line: textDocument.lineCount + 1, character: 0 }};
  const object = new RslEntityWithBody(textDocument, range);

  const module = Imports.find(m => m.uri === uri);
  if (module) {
    module.object = object;
  } else {
    Imports.push({ uri, object });
  }
}

connection.onDocumentSymbol(async ({ textDocument }, token) => {
  const document = getCurDoc(textDocument.uri);
  refreshModule(document);

  const tree = getCurObj(textDocument.uri);
  const ret = getSymbols(document, tree).filter(n => n);

  return ret;
});

documents.listen(connection);

connection.listen();
