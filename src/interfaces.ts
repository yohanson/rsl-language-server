import { CompletionItemKind, InsertTextFormat, CompletionItem, Location, MarkupContent, MarkupKind } from 'vscode-languageserver';
import { varType } from './enums';
import { CBase } from './common';
/**
 * Интерфейс для массива с импортированными модулями
 */
export interface IImport {
    uri     : string;
    object  : CBase;
}

/**
 * Интерфейс для кортежей
 */
export interface If_s<T> {
    first   : boolean;
    second  : T;
}

/**
 * Интерфейс запроса на показ местоположения в файле
 */
export interface IReqOpenLocation {
    uri         : string;
    location    : Location;
    range       : IRange;
}

/**
 * Интерфейс для NextToken
 */
export interface IToken {
    str     : string;
    range   : IRange;
}

/**
 * Интерфейс для настроек сервера
 */
export interface IRslSettings {
	import: boolean;
}

/**
 * Интерфейс для диапазона
 */
export interface IRange {
    start   :number;
    end     :number;
}



/**
 * Интерфейс для Массивов со строками
 */
export interface IArray {
    _it:Array<string>;
    is(it:string):If_s<number>;
    str(num:varType): string
}

/**
 * Абстрактный базовый класс, отсюда будем танцевать при парсинге
 */
export abstract class CAbstractBase {
/**
 * Имя переменной, макроса или класса
 */
    protected name            : string;
/**
 * Флаг приватности
 */
    protected isPrivate        : boolean;
/**
 * Начало и конец блока
 */
    protected range           : IRange;
/**
 * Тип Объекта, перечисление CompletionItemKind
 */
    protected objKind         : CompletionItemKind;
/**
 * Тип переменной или возвращаемое значение
 */
    protected varType_        : string;
/**
 * Описание для автодополнения
 */
    protected description     : MarkupContent;
/**
 * Верхняя строка описания для автодополнения
 */
    protected detail          : string;
/**
 * Вставляемый текст
 */
    protected insertedText    : string;

/**
 * Конструктор
 */
    constructor() {
        this.name            = "";
        this.isPrivate        = false;
        this.range           = {start: 0, end: 0};
        this.objKind         = CompletionItemKind.Unit;
        this.varType_        = "variant";
        this.description     = {kind: MarkupKind.Markdown, value: ''};
        this.detail          = "";
        this.insertedText    = "";
    }

/**
 * возвращает флаг приватности
 */
    get Private() : boolean{ return this.isPrivate }
/**
 * Устанавливает флаг приватности
 */
    set Private(isPrivate: boolean) {this.isPrivate = isPrivate}
/**
 * Возвращает имя
 */
    get Name(): string {return this.name}
/**
 * Возвращает тип значения переменной или возвращаемый тип для макроса
 */
    get Type(): string {return this.varType_}
/**
 * Устанавливает тип переменной
 */
    setType(type: string) {this.varType_ = type}
/**
 * Возвращает диапазон блока
 */
    get Range(): IRange {return this.range}
/**
 * Устанавливает диапазон блока
 */
    setRange(range:IRange) {this.range = range}
/**
 * Возвращает тип объекта
 */
    get ObjKind(): CompletionItemKind {return this.objKind}
/**
 * Возвращает инфо объекта для автодополнения
 */
    abstract updateCompletionInfo();
/**
 * Возвращает инфо объекта для автодополнения
 */
    get CompletionInfo(): CompletionItem {
        this.updateCompletionInfo();
        return {
            label: this.name,
            documentation: this.description,
            insertTextFormat: InsertTextFormat.PlainText,
            kind: this.objKind,
            detail: this.detail,
            insertText: this.insertedText
        }
    }
/**
 * Возвращает является ли данный элемент функцией, методом или классом
 */
    isObject():boolean
    {
        return this.objKind === CompletionItemKind.Class || this.objKind === CompletionItemKind.Function || this.objKind === CompletionItemKind.Method;
    }
/**
 * Возвращает актуален ли объект для позиции в документе
 */
    abstract isActual(pos: number): boolean;
/**
 * Устанавливает описание для автодополнения
 */
    Description(desc: string) {this.description.value = desc}
/**
 * Рекурсивный поиск внутри объекта
 */
    RecursiveFind(name: string): CAbstractBase {return undefined}

	abstract reParsing():void;
}
