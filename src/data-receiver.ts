import { Frame as Frame } from "./frame";
import { getFunctionCodeDescription, valueToHex } from "./function-codes";

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

    report(success: boolean, bytes: number[]): void {
        const tr = document.createElement('tr');
        const now = new Date();
        const time = `${now.toLocaleTimeString()}+${now.getMilliseconds()}ms`;
        if (success) {
            const frame = new Frame(bytes);
            [
                time,
                `${frame.slaveAddress}`,
                `${frame.functionCode}`,
                getFunctionCodeDescription(frame.functionCode),
                `${bytes.length}`,
            ].forEach((it) => tr.appendChild(this.getItemElement(it)));
            const items: any[] = [frame.fromMasterToSlave, frame.fromSlaveToMaster];
            if (typeof items[0] === 'string' && typeof items[1] === 'string') {
                items.forEach((it) => tr.appendChild(this.getItemElement(it, true)));
            } else {
                items.forEach((it) => tr.appendChild(this.getItemElement(typeof it === 'object' ? JSON.stringify(it, undefined, 1) : '')));
            }
        } else {
            tr.classList.add('error');
            [
                time,
                ``,
                ``,
                '',
                `${bytes.length}`,
                bytes.map((it) => valueToHex(it)).join(' '),
                ``,
            ].forEach((it) => tr.appendChild(this.getItemElement(it)));
        }
        this.snifferTable.appendChild(tr);
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
        this.timeoutHandler = setTimeout(() => this.endFrame(), 200);
        data.forEach((byte) => {
            this.history.push(new CurrentByte(byte));
            for (let i = 0; i < this.history.length; ++i) {
                if (this.history[i].updateCrc(byte)) {
                    const bytes = this.history.map((it) => it.byte);
                    if (i) {
                        this.report(false, bytes.slice(0, i));
                    }
                    this.report(true, bytes.slice(i, -2));
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

    endFrame(): void {
        console.warn('timeout');
        this.report(false, this.history.map((it) => it.byte));
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
                    this.report(!isNaN(this.currentLrc) && (this.currentLrc & 0xff) === 0, this.frameBytes);
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
            this.report(false, this.frameBytes);
            this.frameBytes = [];
            this.currentLrc = 0x00;
        }
    }

    updateLrc(byte: number): void {
        this.currentLrc += byte;
    }
}
