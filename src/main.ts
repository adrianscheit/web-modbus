/// <reference types="w3c-web-serial" />

import { AsciiModeStrategy, ModeStrategy, RtuModeStrategy } from "./mode";
import { clearSniffingTable, Dom, downloadAllSniffedEntries, insertFrameRow } from "./dom";
import { Frame } from "./frame";
import { intTest } from "./int.spec";
import { FunctionCodes } from "./function-codes";

const serial: Serial = navigator.serial;
if (!serial) {
    reportError('No serial support in this browser. Use current version of Edge, Chrome or Opera.');
    Dom.serialForm.setFieldsetDisabled(true);
}

Dom.clearSnifferButton.addEventListener('click', () => {
    clearSniffingTable();
});
Dom.downloadSnifferButton.addEventListener('click', () => {
    downloadAllSniffedEntries();
});

Dom.serialForm.submit = (formData) => {
    formData.baudRate = +formData.baudRate;
    formData.stopBits = formData.parity !== 'none' ? 1 : 2;
    formData.dataBits = formData.mode === 'ASCII' ? 7 : 8;
    start(formData, formData.mode === 'ASCII' ? new AsciiModeStrategy() : new RtuModeStrategy());
};

let send: ((bytest: number[]) => Promise<void>) | undefined = undefined;

const start = (serialOptions: SerialOptions, mode: ModeStrategy) => {
    Dom.clearError();
    serial.requestPort().then((serialPort: SerialPort) => {
        console.log('serialPort', serialPort);
        serialPort.open(serialOptions).then(async () => {
            Dom.serialForm.setFieldsetDisabled(true);
            const writer = serialPort.writable?.getWriter();
            if (writer) {
                send = async (bytes: number[]) => {
                    const rawFrame = mode.send(bytes);
                    await writer.write(rawFrame);
                }
            } else {
                console.error('Port is not writable!');
            }

            while (serialPort.readable) {
                const reader: ReadableStreamDefaultReader<Uint8Array> = serialPort.readable.getReader();
                try {
                    while (true) {
                        const { value, done } = await reader.read();
                        if (done) {
                            break;
                        }
                        mode.receive(value);
                    }
                } catch (error) {
                    reportError(error);
                } finally {
                    reader.releaseLock();
                }
            }
            writer?.releaseLock();
            send = undefined;
            await serialPort.close();
            Dom.sendForm.setFieldsetDisabled(false);
        }, reportError);
    }, console.warn);
};

[...FunctionCodes.descriptions.keys()].forEach((code: number) => Dom.addFunctionCodeListOption(code));

Dom.sendForm.submit = (formData) => {
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
    if (send) {
        send(frameBytes);
    }
};

// intTest();