import { getTime } from "./data-receiver";

const domError: Text = document.querySelector('h2.error')!.appendChild(document.createTextNode(''));
export const reportError = (error?: any): void => {
    console.error(error);
    const errorMessage = `Error: ${error}`;
    domError.nodeValue = errorMessage;
    insertSniffedRow([
        new TableDataColumn(getTime(), true),
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
    constructor(text: string, error: boolean = false) {
        this.td = document.createElement('td');
        this.td.appendChild(document.createTextNode(text));
        if (error) {
            this.td.classList.add('error');
        }
    }
}
const snifferTable: HTMLElement = document.querySelector('tbody')!;
export const insertSniffedRow = (columns: TableDataColumn[]): void => {
    const tr = document.createElement('tr');
    columns.forEach((it) => tr.appendChild(it.td));
    snifferTable.insertBefore(tr, snifferTable.firstChild);
    if (snifferTable.childElementCount > 1000) {
        snifferTable.removeChild(snifferTable.lastChild!);
    }
};