import { Frame as Frame } from "./frame";
import { getFunctionCodeDescription } from "./function-codes";

export abstract class DataReceiver {
    protected snifferTable: HTMLElement = document.querySelector('table')!;

    receive(data: Uint8Array): void {
        // console.log('received: ', data);
    }

    getItemElement(text: string, error: boolean = false) {
        const td = document.createElement('td');
        td.appendChild(document.createTextNode(text));
        if (error) {
            td.classList.add('error');
        }
        return td;
    }

    report(success: boolean, frame: Frame): void {
        const tr = document.createElement('tr');
        const now = new Date();
        [
            `${now.toLocaleTimeString()}+${now.getMilliseconds()}ms`,
            `${frame.slaveAddress}`,
            `${frame.functionCode}`,
            getFunctionCodeDescription(frame.functionCode),
        ].forEach((it) => tr.appendChild(this.getItemElement(it)));
        const items: any[] = [frame.fromMasterToSlave, frame.fromSlaveToMaster];
        if (typeof items[0] === 'string' && typeof items[1] === 'string') {
            items.forEach((it) => tr.appendChild(this.getItemElement(it, true)));
        } else {
            items.forEach((it) => tr.appendChild(this.getItemElement(typeof it === 'object' ? JSON.stringify(it, undefined, 1) : '')));
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
        this.timeoutHandler = setTimeout(() => this.endFrame(), 120);
        data.forEach((it) => {
            this.frameBytes.push(it);
            this.updateCrc(it);
            if (this.currentCrc === 0 && this.frameBytes.length >= 4) {
                // assume end of frame
                this.endFrame();
            }
            // if (this.frameBytes.length > 300) {
            //     console.warn('Rejecteding 300 bytes');
            //     this.endFrame();
            // }
        });
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
