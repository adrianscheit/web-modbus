/// <reference types="w3c-web-serial" />

import {ModeStrategy} from "./mode/mode-startegy";
import {clearSniffingTable, Dom, downloadAllSniffedEntries, insertFrameRow} from "./dom";
import {Frame} from "./frame";
import {FunctionCodes} from "./function-codes";
import {RtuModeStrategy} from "./mode/rtu-mode-strategy";
import {AsciiModeStrategy} from "./mode/ascii-mode-strategy";

const serial: Serial = navigator.serial;
if (!serial) {
    Dom.reportError('No WEB Serial API support in this browser. Use current desktop version of Edge, Chrome or Opera.');
    Dom.serialForm.setFieldsetDisabled(true);
}

Dom.clearSnifferButton.addEventListener('click', () => clearSniffingTable());
Dom.downloadSnifferButton.addEventListener('click', () => downloadAllSniffedEntries());

Dom.serialForm.submit = (formData) => {
    formData.baudRate = +formData.baudRate;
    formData.stopBits = formData.parity !== 'none' ? 1 : 2;
    formData.dataBits = formData.mode === 'ASCII' ? 7 : 8;
    start(formData, formData.mode === 'ASCII' ? new AsciiModeStrategy() : new RtuModeStrategy(formData.baudRate));
};

let send: ((bytest: number[]) => Promise<void>) | undefined = undefined;

const start = async (serialOptions: SerialOptions, mode: ModeStrategy) => {
    Dom.clearError();
    Dom.serialForm.setFieldsetDisabled(true);
    try {
        const serialPort: SerialPort = await serial.requestPort();
        await serialPort.open(serialOptions);
        Dom.successText.setText(`Connected successfully`);

        send = async (bytes: number[]) => {
            const rawFrame = mode.send(bytes);
            const writer = serialPort.writable!.getWriter();
            await writer.write(rawFrame);
            writer.releaseLock();
            Dom.successText.setText(`Sent successfully at ${Frame.getDateTime()}`);
        }

        while (serialPort.readable) {
            const reader: ReadableStreamDefaultReader<Uint8Array> = serialPort.readable.getReader();
            try {
                while (true) {
                    const {value, done} = await reader.read();
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
        await serialPort.close();
    } catch (e: any) {
        Dom.reportError(e.message || e.toString());
    } finally {
        send = undefined;
        Dom.serialForm.setFieldsetDisabled(false);
        Dom.successText.setText(``);
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