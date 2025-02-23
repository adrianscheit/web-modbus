import {Converters} from "./converters";
import {insertFrameRow} from "./dom";
import {Frame} from "./frame";

export const reportFrame = (frame: Frame): void => {
    insertFrameRow(frame);
};

export abstract class ModeStrategy {
    abstract receive(data: Uint8Array): void;

    abstract send(bytes: number[]): Uint8Array;
}

class RtuCrc {
    crc: number = 0xFFFF;

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

class RtuCurrentByte extends RtuCrc {
    constructor(public readonly byte: number) {
        super();
    }
}

export class RtuModeStrategy extends ModeStrategy {
    history: RtuCurrentByte[] = [];
    timeoutHandler?: any;

    receive(data: Uint8Array): void {
        if (this.timeoutHandler) {
            clearTimeout(this.timeoutHandler!);
        }
        this.timeoutHandler = setTimeout(() => this.resetFrame(), 200);
        data.forEach((byte) => {
            this.history.push(new RtuCurrentByte(byte));
            for (let i = 0; i < this.history.length; ++i) {
                if (this.history[i].updateCrc(byte)) {
                    const bytes = this.history.map((it) => it.byte);
                    if (i) {
                        reportFrame(new Frame(bytes.slice(0, i), 'error'));
                    }
                    const validFrame = new Frame(bytes.slice(i, -2), '');
                    reportFrame(validFrame);
                    this.history = [];
                    clearTimeout(this.timeoutHandler!);
                    break;
                }
            }
            if (this.history.length > 2300) {
                reportFrame(new Frame(this.history.splice(0, 200).map((it) => it.byte), 'error'))
            }
        });
    }

    send(bytes: number[]): Uint8Array {
        const rtuCrc = new RtuCrc();
        bytes.forEach((byte) => rtuCrc.updateCrc(byte));
        const firstCrcByte = rtuCrc.crc & 0xff;
        rtuCrc.updateCrc(firstCrcByte);
        const result = new Uint8Array([...bytes, firstCrcByte, rtuCrc.crc]);
        //this.receive(result);
        return result;
    }

    private resetFrame(): void {
        reportFrame(new Frame(this.history.map((it) => it.byte), 'error'));
        this.history = [];
    }
}

export class AsciiModeStrategy extends ModeStrategy {
    frameChars: number[] = [];
    frameBytes: number[] = [];
    currentLrc: number = 0x00;

    receive(data: Uint8Array): void {
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
                        reportFrame(new Frame(this.frameBytes, ''));
                    } else {
                        reportFrame(new Frame(this.frameBytes, 'error'));
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

    send(bytes: number[]): Uint8Array {
        let lrc = 0;
        bytes.forEach((byte) => lrc += byte);
        const line = `:${Converters.bytesAsHex(bytes)}${Converters.byteToHex(-lrc & 0xff)}\r\n`;
        console.log(bytes, line);
        const result = Converters.textAsUInt8Array(line);
        //this.receive(result);
        return result;
    }

    private resetFrame(): void {
        if (this.frameBytes.length) {
            reportFrame(new Frame(this.frameBytes, 'error'));
            this.frameBytes = [];
            this.currentLrc = 0x00;
        }
    }

    private updateLrc(byte: number): void {
        this.currentLrc += byte;
    }
}
