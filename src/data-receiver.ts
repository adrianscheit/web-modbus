import { getInputChecked, insertSniffedRow, TableDataColumn } from "./dom";
import { Frame as Frame } from "./frame";
import { getFunctionCodeDescription, valueToHex } from "./function-codes";

export const getTime = (): string => {
    const now = new Date();
    return `${now.toLocaleTimeString()}+${now.getMilliseconds()}ms`;
};

const getBytesAsHex = (bytes: number[]): string => {
    return bytes.map((it) => valueToHex(it)).join(' ');
}

export const reportValidFrame = (frame: Frame): void => {
    const columns = [
        getTime(),
        `${frame.slaveAddress}`,
        `${frame.functionCode}`,
        getFunctionCodeDescription(frame.functionCode),
        `${frame.data.length}`,
    ].map((it) => new TableDataColumn(it, false));
    if (frame.isNoValidDataFormat()) {
        [frame.fromMasterToSlaveError, frame.fromSlaveToMasterError]
            .forEach((it) => columns.push(new TableDataColumn(`${it} ${getBytesAsHex(frame.data)}`, true)));
    } else {
        [frame.fromMasterToSlave, frame.fromSlaveToMaster]
            .forEach((it) => columns.push(new TableDataColumn(JSON.stringify(it, undefined, 2))));
    }
    insertSniffedRow(columns);
};

export const reportInvalidData = (bytes: number[]): void => {
    insertSniffedRow([
        getTime(),
        ``,
        ``,
        getBytesAsHex(bytes),
    ].map((it) => new TableDataColumn(it, true)));
};

export abstract class DataReceiver {
    receive(data: Uint8Array): void {
        // console.log('received: ', data);
    }
}

class CurrentByte {
    crc: number = 0xFFFF;

    constructor(public readonly byte: number) {
    }

    updateCrc(byte: number): boolean {
        this.crc ^= byte;
        for (let i = 0; i < 8; ++i) {
            const xor = this.crc & 1;
            this.crc >>= 1;
            if (xor) {
                this.crc ^= 0xA001;
            }
        }
        return this.crc === 0;
    }
}

export class RtuDataReceiver extends DataReceiver {
    history: CurrentByte[] = [];
    timeoutHandler?: any;

    receive(data: Uint8Array): void {
        super.receive(data);
        if (this.timeoutHandler) {
            clearTimeout(this.timeoutHandler!);
        }
        this.timeoutHandler = setTimeout(() => this.resetFrame(), 300);
        data.forEach((byte) => {
            this.history.push(new CurrentByte(byte));
            for (let i = 0; i < this.history.length; ++i) {
                if (this.history[i].updateCrc(byte)) {
                    const bytes = this.history.map((it) => it.byte);
                    const validFrame = new Frame(bytes.slice(i, -2));
                    if (getInputChecked('onlyValid')) {
                        if (this.history.length < 4 || validFrame.isNoValidDataFormat()) {
                            console.warn(`Found end of frame (i=${i}) but the data field seems invalid!`, validFrame);
                            continue;
                        }
                    }
                    if (i) {
                        reportInvalidData(bytes.slice(0, i));
                    }
                    reportValidFrame(validFrame);
                    this.history = [];
                    clearTimeout(this.timeoutHandler!);
                    break;
                }
            }
            if (this.history.length > 300) {
                console.warn('Rejecteding because history bigger than 300', this.history.shift());
            }
        });
    }

    resetFrame(): void {
        console.warn('timeout');
        reportInvalidData(this.history.map((it) => it.byte));
        this.history = [];
    }
}

export class AsciiDataReceiver extends DataReceiver {
    frameChars: number[] = [];
    frameBytes: number[] = [];
    currentLrc: number = 0x00;

    receive(data: Uint8Array): void {
        super.receive(data);
        data.forEach((it) => this.frameChars.push(it));
        while (this.frameChars.length >= 2) {
            const char: number = this.frameChars.shift()!;
            if (char === 0x3A) {
                this.resetFrame();
            } else {
                const char2: number = this.frameChars.shift()!;
                if (char2 === 0x3A) {
                    this.resetFrame();
                } else if (char === 0x0D && char2 === 0x0A) {
                    this.frameBytes.pop();
                    if (!isNaN(this.currentLrc) && (this.currentLrc & 0xff) === 0) {
                        reportValidFrame(new Frame(this.frameBytes))
                    } else {
                        reportInvalidData(this.frameBytes);
                    }
                    this.frameBytes = [];
                    this.currentLrc = 0x00;
                } else {
                    const byte = parseInt(String.fromCharCode(char, char2), 16);
                    this.frameBytes.push(byte);
                    this.updateLrc(byte);
                }
            }
        }
    }

    resetFrame(): void {
        if (this.frameBytes.length) {
            reportInvalidData(this.frameBytes);
            this.frameBytes = [];
            this.currentLrc = 0x00;
        }
    }

    updateLrc(byte: number): void {
        this.currentLrc += byte;
    }
}
