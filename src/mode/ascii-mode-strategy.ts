import {Frame} from "../frame";
import {Converters} from "../converters";
import {ModeStrategy, reportFrame} from "./mode-startegy";

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