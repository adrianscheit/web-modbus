import { Converters } from "./converters";
import { dataFieldStrategies } from "./data-field";
import { TableDataColumn } from "./dom";
import { getFunctionCodeDescription } from "./function-codes";

export class Frame {
    readonly slaveAddress: number;
    readonly functionCode?: number;
    readonly fromMasterToSlave?: any;
    readonly fromSlaveToMaster?: any;
    readonly fromMasterToSlaveError?: string;
    readonly fromSlaveToMasterError?: string;

    constructor(readonly data: number[], readonly type: 'error' | 'send' | '') {
        this.slaveAddress = data.shift()!;
        this.functionCode = data.shift();
        if (type !== 'error' || this.functionCode === undefined) {
            const specificFormat = dataFieldStrategies[this.functionCode!];
            if (specificFormat) {
                try {
                    this.fromMasterToSlave = new specificFormat.fromMasterToSlave(data);
                } catch (e: any) {
                    this.fromMasterToSlaveError = this.getError(e);
                }
                try {
                    this.fromSlaveToMaster = new specificFormat.fromSlaveToMaster(data);
                } catch (e: any) {
                    this.fromSlaveToMasterError = this.getError(e);
                }
            }
        }
    }

    static getDateTime(): string {
        const now = new Date();
        return `${now.toLocaleString()}+${now.getMilliseconds()}ms`;
    }

    getDataLength(): number {
        return this.data.length;
    }

    getDataAsHex(): string {
        return Converters.bytesAsHex(this.data);
    }

    getRow(): TableDataColumn[] {
        return [
            new TableDataColumn(Frame.getDateTime(), this.type),
            new TableDataColumn(`${this.slaveAddress}=0x${Converters.byteToHex(this.slaveAddress!)}`, this.type),
            new TableDataColumn(`${this.functionCode}=${this.functionCode === undefined ? '' : getFunctionCodeDescription(this.functionCode)}`, this.type),
            new TableDataColumn(this.getDataLength().toString(), this.type),
            new TableDataColumn(this.getDataAsText(), this.isNoValidDataFormat() ? 'error' : this.type),
        ];
    }

    private getDataAsText(): string {
        if (this.type === 'error') {
            return `Invalid frame: 0x${this.getDataAsHex()}`;
        } else if (this.isUnknownFrame()) {
            return `Function code is invalid: 0x${this.getDataAsHex()}`;
        } else if (this.isNoValidDataFormat()) {
            return `This frame format does not fit to the function code: fromMasterToSlaveError=${this.fromMasterToSlaveError}; fromSlaveToMasterError=${this.fromSlaveToMasterError}; for: 0x${this.getDataAsHex()}`;
        } else {
            return `Valid frame: fromMasterToSlave=${JSON.stringify(this.fromMasterToSlave)}; fromSlaveToMasterError=${JSON.stringify(this.fromSlaveToMaster)}`;
        }
    }

    private isNoValidDataFormat(): boolean {
        return !!this.fromMasterToSlaveError && !!this.fromSlaveToMasterError;
    }

    private isUnknownFrame(): boolean {
        return !this.isNoValidDataFormat() && !this.fromMasterToSlave && !this.fromSlaveToMaster;
    }

    protected getError(e: any): string {
        return e.message;
    }
}
