import { RslEntityWithBody } from './common';
import {
  CompletionItemKind,
  TextDocument,
  SymbolInformation
} from 'vscode-languageserver';
import { fromCompletionItemKind, convertToRange } from './utils';

function getSymbolName(node: RslEntityWithBody) {
  const nodeType = node.ObjKind !== CompletionItemKind.Class ? node.Type : '';
  const typeDelim = nodeType ? ': ' : '';

  return `${node.Name}${typeDelim}${nodeType}`;
}
const scopeKinds: number[] = [
  CompletionItemKind.Class,
  CompletionItemKind.Method,
  CompletionItemKind.Function,
  CompletionItemKind.Module,
  CompletionItemKind.Unit,
  CompletionItemKind.Struct
];

function isScope(k: CompletionItemKind) {
  return scopeKinds.includes(k);
}

export function getSymbols(
  document: TextDocument,
  node: RslEntityWithBody,
  parent?: RslEntityWithBody
): (SymbolInformation | undefined)[] {
  let info: SymbolInformation | undefined;

  /**
   * Отображаем все символы на глобальном уровне
   * макросы вложенные в макросы
   * методы и свойства внутри классов
   */
  if (
    node.canHaveChildren() || // функция или класс
    parent?.ObjKind === CompletionItemKind.Class ||
    parent?.ObjKind === CompletionItemKind.Unit // var в классе или в глобальном scope
  ) {
    try {
      info = {
        kind: fromCompletionItemKind(node.ObjKind),
        location: {
          range: convertToRange(document, node.Range),
          uri: document.uri
        },
        name: getSymbolName(node),
        containerName: parent?.Name
      };
    } catch (e) {
      // do not show not supported node kind
    }
  }

  const innerSymbols = isScope(node.ObjKind)
    ? node.getChildren().reduce((symbols, child) => {
        if (child instanceof RslEntityWithBody) {
            const syms = getSymbols(document, child, node);
            symbols.push(...syms);
        }
        return symbols;
      }, [])
    : [];

  return [info, ...innerSymbols];
}
