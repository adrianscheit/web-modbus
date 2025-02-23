import {Converters} from "../converters";
import {ModeStrategy, ReportType} from "./mode-startegy";

export class AsciiModeStrategy implements ModeStrategy {
    frameChars: number[] = [];
    frameBytes: number[] = [];
    currentLrc: number = 0x00;

    constructor(readonly report: (bytes: number[], type: ReportType) => void) {
    }

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
                        this.report(this.frameBytes, ReportType.valid);
                    } else {
                        this.report(this.frameBytes, ReportType.errored);
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
        return Converters.textAsUInt8Array(line);
    }

    private resetFrame(): void {
        if (this.frameBytes.length) {
            this.report(this.frameBytes, ReportType.errored);
            this.frameBytes = [];
            this.currentLrc = 0x00;
        }
    }

    private updateLrc(byte: number): void {
        this.currentLrc += byte;
    }
}