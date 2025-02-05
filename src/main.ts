/// <reference types="w3c-web-serial" />

import { DataField, dataFieldStrategies } from "./data-field";
import { AsciiDataReceiver, DataReceiver, RtuDataReceiver } from "./data-receiver";
import { addLabel, clearError, clearSniffingTable, downloadAllSniffedEntries, insertFrameRow, reportError, setSerialFieldsetDisable } from "./dom";
import { Frame } from "./frame";
import { byteToHex, errorCodes, functionCodes } from "./function-codes";
import { intTest } from "./int.spec";

const serial: Serial = navigator.serial;
if (!serial) {
    reportError('No serial support in this browser!');
    setSerialFieldsetDisable(true);
}

document.getElementById('clearSnifferButton')!.addEventListener('click', () => {
    clearSniffingTable();
});
document.getElementById('downloadSnifferButton')!.addEventListener('click', () => {
    downloadAllSniffedEntries();
});

interface ConnectionForm {
    modbusmode: 'ASCII' | 'RTU';
    baudRate: number;
    parity: ParityType;
    stopBits?: 1 | 2;
    dataBits?: 7 | 8;
}

const extractFormData = <T>(form: any): T => {
    return Object.fromEntries(
        [...form].map((it: any): [string, string] => [it.name, it.value])
    ) as T;
};

document.querySelector('form')!.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData: ConnectionForm = extractFormData(event.target);
    formData.baudRate = +formData.baudRate;
    formData.stopBits = formData.parity !== 'none' ? 1 : 2;
    formData.dataBits = formData.modbusmode === 'ASCII' ? 7 : 8;
    console.log(formData);
    start(formData, formData.modbusmode === 'ASCII' ? new AsciiDataReceiver() : new RtuDataReceiver());
});

const start = (serialOptions: SerialOptions, dataReceiver: DataReceiver) => {
    clearError();
    serial.requestPort().then((serialPort: SerialPort) => {
        console.log('serialPort', serialPort);
        serialPort.open(serialOptions).then(async () => {
            setSerialFieldsetDisable(true);

            while (serialPort.readable) {
                const reader: ReadableStreamDefaultReader<Uint8Array> = serialPort.readable.getReader();
                try {
                    while (true) {
                        const { value, done } = await reader.read();
                        if (done) {
                            break;
                        }
                        dataReceiver.receive(value);
                    }
                } catch (error) {
                    reportError(error);
                } finally {
                    reader.releaseLock();
                }
            }
            await serialPort.close();
            setSerialFieldsetDisable(false);
        }, reportError);
    }, console.warn);
};

const functionCodeList = document.getElementById('functionCodeList')!;
const addFunctionCodeListOption = (code: string, description: string): void => {
    const option = document.createElement('option');
    option.value = code;
    option.appendChild(document.createTextNode(description));
    functionCodeList.appendChild(option);
};
[...Object.entries(functionCodes), ...Object.entries(errorCodes)].forEach(([code, description]) => addFunctionCodeListOption(code, description));
document.querySelector('form[name=send]')!.addEventListener('submit', event => {
    event.preventDefault();
    const formData: { slaveAddress: number, functionCode: number, data: string } = extractFormData(event.target);
    formData.slaveAddress = +formData.slaveAddress;
    formData.functionCode = +formData.functionCode;
    formData.data = formData.data.toString().replaceAll(/[\n\r\s]+/gm, '');
    let data = (formData.data.length & 1 ? '0' : '') + formData.data;
    const bytes: number[] = [];
    for (let i = 0; i < data.length; i += 2) {
        console.log(data.substring(i, 2));
        bytes.push(parseInt(data.substring(i, i + 2), 16));
    }
    const frameBytes = new Uint8Array([formData.slaveAddress, formData.functionCode, ...bytes]);
    console.log(formData, frameBytes);
    insertFrameRow(new Frame(Array.from(frameBytes)), 'send');
});

// intTest();