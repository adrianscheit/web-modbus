/// <reference types="w3c-web-serial" />

import { AsciiDataReceiver, DataReceiver, RtuDataReceiver } from "./data-receiver";
import { clearError, clearSniffingTable, downloadAllSniffedEntries, reportError, setSerialFieldsetDisable } from "./dom";
import { intTest } from "./int.spec";

const serial: Serial = navigator.serial;
if (!serial) {
    reportError('No serial support in this browser!');
    setSerialFieldsetDisable(true);
}

document.getElementById('clearSnifferButton')?.addEventListener('click', () => {
    clearSniffingTable();
});
document.getElementById('downloadSnifferButton')?.addEventListener('click', () => {
    downloadAllSniffedEntries();
});

document.querySelector('form')!.addEventListener('submit', event => {
    event.preventDefault();
    const formData = Object.fromEntries(
        [...event.target as any]
            .map((it: any): [string, string | number] => [it.name, (+it.value || it.value)])
    );
    console.log(formData);
    start(formData as any, formData.modbusmode === 'ASCII' ? new AsciiDataReceiver() : new RtuDataReceiver());
});

const start = (serialOptions: SerialOptions, dataReceiver: DataReceiver) => {
    serial.requestPort().then((serialPort: SerialPort) => {
        console.log('serialPort', serialPort);
        serialPort.open(serialOptions).then(async () => {
            clearError();
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

intTest();