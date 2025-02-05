import { Frame } from "./frame";
import { byteToHex, getFunctionCodeDescription } from "./function-codes";

export const getBytesAsHex = (bytes: number[]): string => {
    return bytes.map((it) => byteToHex(it)).join(' ');
}

const getDateTime = (): string => {
    const now = new Date();
    return `${now.toLocaleString()}+${now.getMilliseconds()}ms`;
};

const domError: Text = document.querySelector('h2.error')!.appendChild(document.createTextNode(''));
export const reportError = (error?: any): void => {
    console.error(error);
    const errorMessage = `Error: ${error}`;
    domError.nodeValue = errorMessage;
    insertErrorRow(errorMessage, undefined);
};
export const clearError = (): void => {
    domError.nodeValue = ``;
};

const serialFieldset: HTMLFieldSetElement = document.querySelector('fieldset')!;
const sendFieldset: HTMLFieldSetElement = document.querySelector('form[name=send] fieldset')!;
export const setSerialFieldsetDisable = (disabled: boolean): void => {
    serialFieldset.disabled = disabled;
};
export const setSendFieldsetDisable = (disabled: boolean): void => {
    sendFieldset.disabled = disabled;
};


export class TableDataColumn {
    readonly td: HTMLElement = document.createElement('td');
    readonly csv: string;

    constructor(text: string, className: '' | 'error' | 'send' = '') {
        this.td.appendChild(document.createTextNode(text));
        if (className) {
            this.td.classList.add(className);
        }
        this.csv = `${`${text}`.replace(/[\n\r]/gm, "").replace(/,/gm, ';')}`;
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
    allSniffedEntries.unshift(columns.map((it) => it.csv).join(','))
};
export const insertFrameRow = (frame: Frame, className: '' | 'send' = ''): void => {
    const columns = [
        getDateTime(),
        `${frame.slaveAddress}`,
        `${frame.functionCode} ${getFunctionCodeDescription(frame.functionCode)}`,
        `${frame.data.length}`,
    ].map((it) => new TableDataColumn(it, className));

    if (frame.isUnknownFrame()) {
        columns.push(new TableDataColumn(`Unknown frame: ${getBytesAsHex(frame.data)}`, 'error'));
    } else if (frame.isNoValidDataFormat()) {
        columns.push(new TableDataColumn(`This frame format does not fit to the function: 
            fromMasterToSlaveError=${frame.fromMasterToSlaveError} 
            fromSlaveToMasterError=${frame.fromSlaveToMasterError}
            , for: ${getBytesAsHex(frame.data)}`, 'error'));
    } else {
        columns.push(new TableDataColumn(
            JSON.stringify(frame.fromMasterToSlave) +
            JSON.stringify(frame.fromSlaveToMaster)
        ));
    }

    insertSniffedRow(columns);
};
export const insertErrorRow = (errorMessage: string, dataLength: number | undefined): void => {
    insertSniffedRow([
        getDateTime(),
        ``,
        ``,
        `${dataLength === undefined ? '' : dataLength}`,
        errorMessage,
    ].map((it) => new TableDataColumn(it, 'error')));
};

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
    if (allSniffedEntries.length === 0) {
        return;
    }
    const csvString = allSniffedEntries.join('\r\n');
    const a = window.document.createElement('a');
    a.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvString));
    a.setAttribute('download', `sniffed data ${getDateTime()}.csv`);
    a.click();
}
export const addLabel = (text: string, input: HTMLElement): HTMLLabelElement => {
    const label = document.createElement('label');
    label.appendChild(document.createTextNode(text));
    label.appendChild(input);
    return label;
}