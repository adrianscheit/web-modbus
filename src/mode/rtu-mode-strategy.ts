import {ModeStrategy, ReportType} from "./mode-startegy";

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

export class RtuModeStrategy implements ModeStrategy {
    protected history: RtuCurrentByte[] = [];
    protected timeoutHandler?: any;
    protected timeoutMs: number;

    constructor(readonly report: (bytes: number[], type: ReportType) => void, baudRate: number) {
        this.timeoutMs = 1 + Math.ceil(50 * 1000 / baudRate);
    }

    receive(data: Uint8Array): void {
        if (this.timeoutHandler) {
            clearTimeout(this.timeoutHandler!);
        }
        this.timeoutHandler = setTimeout(() => this.resetFrame(), this.timeoutMs);
        data.forEach((byte) => {
            this.history.push(new RtuCurrentByte(byte));
            for (let i = 0; i < this.history.length; ++i) {
                if (this.history[i].updateCrc(byte)) {
                    const bytes = this.history.map((it) => it.byte);
                    if (i) {
                        this.report(bytes.slice(0, i), ReportType.errored);
                    }
                    this.report(bytes.slice(i, -2), ReportType.valid);
                    this.history = [];
                    clearTimeout(this.timeoutHandler!);
                    break;
                }
            }
            if (this.history.length > 2300) {
                this.report(this.history.splice(0, 200).map((it) => it.byte), ReportType.errored);
            }
        });
    }

    send(bytes: number[]): Uint8Array {
        const rtuCrc = new RtuCrc();
        bytes.forEach((byte) => rtuCrc.updateCrc(byte));
        const firstCrcByte = rtuCrc.crc & 0xff;
        rtuCrc.updateCrc(firstCrcByte);
        return new Uint8Array([...bytes, firstCrcByte, rtuCrc.crc]);
    }

    private resetFrame(): void {
        this.report(this.history.map((it) => it.byte), ReportType.errored);
        this.history = [];
    }
}