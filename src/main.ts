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

Dom.clearSnifferButton.addEventListener('click', () => clearSniffingTable());
Dom.downloadSnifferButton.addEventListener('click', () => downloadAllSniffedEntries());

Dom.serialForm.submit = (formData) => {
    formData.baudRate = +formData.baudRate;
    formData.stopBits = formData.parity !== 'none' ? 1 : 2;
    formData.dataBits = formData.mode === 'ASCII' ? 7 : 8;
    start(formData, formData.mode === 'ASCII' ? new AsciiModeStrategy() : new RtuModeStrategy());
};

let send: ((bytest: number[]) => Promise<void>) | undefined = undefined;

const start = async (serialOptions: SerialOptions, mode: ModeStrategy) => {
    Dom.clearError();
    Dom.serialForm.setFieldsetDisabled(true);
    try {
        const serialPort: SerialPort = await serial.requestPort();
        await serialPort.open(serialOptions);

        send = async (bytes: number[]) => {
            const rawFrame = mode.send(bytes);
            const writer = serialPort.writable!.getWriter();
            await writer.write(rawFrame);
            writer.releaseLock();
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
        send = undefined;
        await serialPort.close();
    } catch (e: any) {
        Dom.reportError(e.message || e.toString());
    } finally {
        Dom.serialForm.setFieldsetDisabled(false);
    }
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
    send?.(frameBytes);
};

// intTest();