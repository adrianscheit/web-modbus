/// <reference types="w3c-web-serial" />

import { AsciiModeStrategy, ModeStrategy, RtuModeStrategy } from "./mode";
import { clearError, clearSniffingTable, downloadAllSniffedEntries, extractFormData, insertFrameRow, reportError, setSerialFieldsetDisable } from "./dom";
import { Frame } from "./frame";
import { errorCodes, functionCodes } from "./function-codes";
import { intTest } from "./int.spec";
import { Converters } from "./converters";

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

document.querySelector('form')!.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData: ConnectionForm = extractFormData(event.target);
    formData.baudRate = +formData.baudRate;
    formData.stopBits = formData.parity !== 'none' ? 1 : 2;
    formData.dataBits = formData.modbusmode === 'ASCII' ? 7 : 8;
    console.log(formData);
    start(formData, formData.modbusmode === 'ASCII' ? new AsciiModeStrategy() : new RtuModeStrategy());
});

const start = (serialOptions: SerialOptions, dataReceiver: ModeStrategy) => {
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
    option.appendChild(document.createTextNode(`${Converters.byteToHex(+code)} ${description}`));
    functionCodeList.appendChild(option);
};
[...Object.entries(functionCodes), ...Object.entries(errorCodes)].forEach(([code, description]) => addFunctionCodeListOption(code, description));
document.querySelector('form[name=send]')!.addEventListener('submit', event => {
    event.preventDefault();
    const formData: { slaveAddress: number, functionCode: number, hexData: string } = extractFormData(event.target);
    formData.slaveAddress = +formData.slaveAddress;
    formData.functionCode = +formData.functionCode;
    formData.hexData = formData.hexData.toString().replaceAll(/[\n\r\s]+/gm, '');
    let data = (formData.hexData.length & 1 ? '0' : '') + formData.hexData;
    const bytes: number[] = [];
    for (let i = 0; i < data.length; i += 2) {
        bytes.push(parseInt(data.substring(i, i + 2), 16));
    }
    const frameBytes: number[] = [formData.slaveAddress, formData.functionCode, ...bytes];
    insertFrameRow(new Frame([...frameBytes], 'send'));
    new AsciiModeStrategy().send(frameBytes);
    new RtuModeStrategy().send(frameBytes);
});

// intTest();