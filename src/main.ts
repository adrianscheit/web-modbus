/// <reference types="w3c-web-serial" />

import { DataField, dataFieldStrategies } from "./data-field";
import { AsciiDataReceiver, DataReceiver, RtuDataReceiver } from "./data-receiver";
import { addLabel, clearError, clearSniffingTable, downloadAllSniffedEntries, reportError, setSerialFieldsetDisable } from "./dom";
import { byteToHex, functionCodes } from "./function-codes";
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

const functionCodeList = document.getElementById('functionCodeList')!;
for (const [code, description] of Object.entries(functionCodes)) {
    const option = document.createElement('option');
    option.value = code;
    option.appendChild(document.createTextNode(description));
    functionCodeList.appendChild(option);
}
const dynamicForm = document.getElementById('dynamicForm')!;
document.getElementById('functionCode')!.addEventListener('change', (event: Event) => {
    const functionCode = +(event.target! as any).value;

    dynamicForm.replaceChildren();

    const dataField: any | undefined = dataFieldStrategies[functionCode]?.fromMasterToSlave;
    console.log(functionCode, dataField);
    if (!dataField) {
        const textArea = document.createElement('textarea');
        textArea.name = 'rawData';
        textArea.required = true;
        dynamicForm.appendChild(addLabel('Raw data(hex):', textArea));
    } else {
        const add16UIntInput = (name: string): void => {
            const input = document.createElement('input');
            input.required = true;
            input.type = 'number';
            input.min = '0';
            input.max = '65535';
            input.step = '1';
            input.name = name;

            dynamicForm.appendChild(addLabel(`${name}:`, input));
        };
        add16UIntInput('address');
        // Not always:
        add16UIntInput('quantity');
    }
});

interface ConnectionForm {
    modbusmode: 'ASCII' | 'RTU';
    baudRate: number;
    parity: ParityType;
    stopBits?: 1 | 2;
    dataBits?: 7 | 8;
}

document.querySelector('form')!.addEventListener('submit', event => {
    event.preventDefault();
    const formData: ConnectionForm = Object.fromEntries(
        [...event.target as any]
            .map((it: any): [string, string | number] => [it.name, (+it.value || it.value)])
    ) as any;
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

// intTest();