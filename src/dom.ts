import { getDateTime } from "./data-receiver";

const domError: Text = document.querySelector('h2.error')!.appendChild(document.createTextNode(''));
export const reportError = (error?: any): void => {
    console.error(error);
    const errorMessage = `Error: ${error}`;
    domError.nodeValue = errorMessage;
    insertSniffedRow([
        new TableDataColumn(getDateTime(), true),
        new TableDataColumn(''),
        new TableDataColumn(''),
        new TableDataColumn(errorMessage, true),
    ]);
};
export const clearError = (): void => {
    domError.nodeValue = ``;
};

const serialFieldset: HTMLFieldSetElement = document.querySelector('fieldset')!;
export const setSerialFieldsetDisable = (disabled: boolean): void => {
    serialFieldset.disabled = disabled;
};

export class TableDataColumn {
    readonly td: HTMLElement;
    readonly csvText: string;

    constructor(text: string, error: boolean = false) {
        this.td = document.createElement('td');
        this.td.appendChild(document.createTextNode(text));
        if (error) {
            this.td.classList.add('error');
        }
        this.csvText = `${`${text}`.replace(/[\n\r]/gm, "").replace(/,/gm, ';')},`;
    }
}

const allSniffedEntries: string[] = [];
const snifferTable: HTMLElement = document.querySelector('tbody')!;
export const insertSniffedRow = (columns: TableDataColumn[]): void => {
    const tr = document.createElement('tr');
    columns.forEach((it) => tr.appendChild(it.td));
    snifferTable.insertBefore(tr, snifferTable.firstChild);
    if (snifferTable.childElementCount > 1000) {
        snifferTable.removeChild(snifferTable.lastChild!);
    }
    allSniffedEntries.unshift(columns.map((it) => it.csvText).join(''))
};

export const getInputChecked = (name: string): boolean => {
    const input: HTMLInputElement = document.querySelector(`input[type=checkbox][name=${name}]`)!;
    return input.checked;
};

export const clearSniffingTable = (): void => {
    while (snifferTable.lastChild) {
        snifferTable.removeChild(snifferTable.lastChild);
    }
    while (allSniffedEntries.length) {
        allSniffedEntries.pop();
    }
};
export const downloadAllSniffedEntries = (): void => {
    if (allSniffedEntries.length === 0) {
        return;
    }
    const csvString = allSniffedEntries.join('\r\n');
    const universalBOM = "\uFEFF";
    const a = window.document.createElement('a');
    a.setAttribute('href', 'data:text/csv; charset=utf-8,' + encodeURIComponent(universalBOM + csvString));
    a.setAttribute('download', `${allSniffedEntries[0].substring(0, 20)}-${allSniffedEntries[allSniffedEntries.length - 1].substring(0, 20)}.csv`);
    a.click();
}