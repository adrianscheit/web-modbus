import { Frame as Frame } from "./frame";

export abstract class DataReceiver {
    protected snifferTable: HTMLElement = document.querySelector('table')!;

    receive(data: Uint8Array): void {
        // console.log('received: ', data);
    }
    report(success: boolean, frame: Frame): void {
        const now = new Date();
        const columns: string[] = [
            `${now.toLocaleTimeString()}+${now.getMilliseconds()}ms`,
            `${frame.slaveAddress}`,
            `${frame.functionCode}`,
            frame.functionDescription,
            JSON.stringify(frame.specificFormats, undefined, 1)
        ];
        const tr = document.createElement('tr');
        for (const item of columns) {
            const td = document.createElement('td');
            td.appendChild(document.createTextNode(item));
            tr.appendChild(td);
        }
        if (!success) {
            tr.classList.add('error');
        }
        this.snifferTable.appendChild(tr);
    }
}

export class RtuDataReceiver extends DataReceiver {
    frameBytes: number[] = [];
    currentCrc: number = 0xFFFF;
    timeoutHandler?: any;

    receive(data: Uint8Array): void {
        super.receive(data);
        if (this.timeoutHandler) {
            clearTimeout(this.timeoutHandler!);
        }
        data.forEach((it) => {
            this.frameBytes.push(it);
            this.updateCrc(it);
            if (this.currentCrc === 0) {
                // assume end of frame
                this.endFrame();
            }
            // if (this.frameBytes.length > 300) {
            //     console.warn('Rejecteding 300 bytes');
            //     this.endFrame();
            // }
        });
        this.timeoutHandler = setTimeout(() => this.endFrame(), 120);
    }

    endFrame(): void {
        this.frameBytes.pop();
        this.frameBytes.pop();
        if (!this.frameBytes.length) {
            return;
        }
        this.report(this.currentCrc === 0, new Frame(this.frameBytes));
        this.frameBytes = [];
        this.currentCrc = 0xffff;
    }

    updateCrc(byte: number): void {
        this.currentCrc ^= byte;
        for (let i = 0; i < 8; ++i) {
            const xor = this.currentCrc & 1;
            this.currentCrc >>= 1;
            if (xor) {
                this.currentCrc ^= 0xA001;
            }
        }
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
            if (this.frameBytes.length === 0) {
            }
            if (char === 0x3A) {
                if (this.frameBytes.length) {
                    this.endFrame();
                }
            } else {
                const char2: number = this.frameChars.shift()!;
                if (char === 0x0D && char2 === 0x0A) {
                    this.endFrame();
                } else {
                    const byte = parseInt(String.fromCharCode(char, char2), 16);
                    this.frameBytes.push(byte);
                    this.updateLrc(byte);
                }
            }
        }
    }

    endFrame(): void {
        this.frameBytes.pop();
        this.report(this.currentLrc === 0, new Frame(this.frameBytes));
        this.frameBytes = [];
        this.currentLrc = 0x00;
    }

    updateLrc(byte: number): void {
        this.currentLrc += byte;
        this.currentLrc &= 0xff;
    }
}
