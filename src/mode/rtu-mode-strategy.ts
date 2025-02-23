import {Frame} from "../frame";
import {ModeStrategy, reportFrame} from "./mode-startegy";

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