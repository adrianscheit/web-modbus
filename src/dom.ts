import { Converters } from "./converters";
import { Frame } from "./frame";
import { FunctionCodes } from "./function-codes";

export class TableDataColumn {
    readonly td: HTMLElement = document.createElement('td');
    readonly csv: string;

    constructor(text: string, className: '' | 'error' | 'send' = '') {
        this.td.appendChild(document.createTextNode(text));
        if (className) {
            this.td.classList.add(className);
        }
        this.csv = `"${`${text}`.replaceAll(/[\n\r,"]/gm, "")}"`;
    }
}

export class TableColumnButton extends TableDataColumn {
    constructor(label: string, click: () => void) {
        super('');
        const button = document.createElement('button');
        button.type = 'button';
        button.addEventListener('click', () => click());
        button.appendChild(document.createTextNode(label));
        this.td.appendChild(button);
    }
}

const allSniffedEntries: string[] = [];
const snifferTable: HTMLElement = document.querySelector('tbody')!;
const insertSniffedRow = (columns: TableDataColumn[]): void => {
    const tr = document.createElement('tr');
    columns.forEach((it) => tr.appendChild(it.td));
    snifferTable.insertBefore(tr, snifferTable.firstChild);
    if (snifferTable.childElementCount > 1000) {
        snifferTable.removeChild(snifferTable.lastChild!);
    }
    allSniffedEntries.unshift(columns.map((it) => it.csv).join(','));
};
export const insertFrameRow = (frame: Frame): void => insertSniffedRow(frame.getRow());

export const getInputChecked = (name: string): boolean => {
    const input: HTMLInputElement = document.querySelector(`input[type=checkbox][name=${name}]`)!;
    return input.checked;
};

export const clearSniffingTable = (): void => {
    snifferTable.replaceChildren();
    while (allSniffedEntries.length) {
        allSniffedEntries.pop();
    }
};
export const downloadAllSniffedEntries = (): void => {
    const csvString = allSniffedEntries.join('\r\n');
    const a = window.document.createElement('a');
    a.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvString));
    a.setAttribute('download', `sniffed data ${Frame.getDateTime()}.csv`);
    a.click();
};

class DomForm<T> {
    private readonly fieldset: HTMLFieldSetElement;
    submit?: (data: T) => void;

    constructor(private readonly element: Element) {
        this.fieldset = element.querySelector('fieldset')!;
        element.addEventListener('submit', (event) => {
            event.preventDefault();
            this.submit?.(this.getFormData());
        });
    }

    getFormData(): T {
        return Object.fromEntries(
            [...this.element as any].filter((it) => it.name).map((it: any): [string, string] => [it.name, it.value])
        ) as T;
    }

    setFormData<T>(data: T): void {
        [...this.element as any].forEach((field) => {
            const value = (data as any)[field.name];
            if (value !== undefined) {
                field.value = value;
            }
        });
    }

    setFieldsetDisabled(disabled: boolean) {
        this.fieldset.disabled = disabled;
    }
}

class DomText {
    private readonly text: Text;
    constructor(element: Element) {
        this.text = element.appendChild(document.createTextNode(''))
    }

    setText(text: string): void {
        this.text.nodeValue = text;
    }
}

interface ConnectionFormData {
    mode: 'ASCII' | 'RTU';
    baudRate: number;
    parity: ParityType;
    stopBits?: 1 | 2;
    dataBits?: 7 | 8;
}

interface SendFormData {
    slaveAddress: number;
    functionCode: number;
    hexData: string;
}

export class Dom {
    private static readonly errorText = new DomText(document.querySelector('h2.error')!);
    static readonly successText = new DomText(document.querySelector('h2.success')!);

    static reportError(error?: any): void {
        console.error(error);
        const errorMessage = `Error: ${error}`;
        this.errorText.setText(errorMessage);
    }
    static clearError(): void {
        this.errorText.setText(``);
    }

    static readonly serialForm = new DomForm<ConnectionFormData>(document.querySelector('form[name=serial]')!);
    static readonly sendForm = new DomForm<SendFormData>(document.querySelector('form[name=send]')!);

    private static readonly functionCodeList = document.getElementById('functionCodeList')!;
    static addFunctionCodeListOption(code: number): void {
        const option = document.createElement('option');
        option.value = code.toString();
        option.appendChild(document.createTextNode(FunctionCodes.getDescription(code)));
        Dom.functionCodeList.appendChild(option);
    }

    static readonly downloadSnifferButton = document.getElementById('downloadSnifferButton')!;
    static readonly clearSnifferButton = document.getElementById('clearSnifferButton')!;
}