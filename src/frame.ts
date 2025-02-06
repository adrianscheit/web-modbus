import { Converters } from "./converters";
import { Dom, TableColumnButton, TableDataColumn } from "./dom";
import { FunctionCodes } from "./function-codes";

export class Frame {
    readonly slaveAddress: number;
    readonly functionCode?: number;
    readonly masterRequest?: any;
    readonly slaveResponse?: any;
    readonly masterRequestError?: string;
    readonly slaveResponseError?: string;
    readonly hexData: string;

    constructor(readonly data: number[], readonly type: 'error' | 'send' | '') {
        this.slaveAddress = data.shift()!;
        this.functionCode = data.shift();
        if (this.functionCode === undefined) {
            type = 'error';
        }
        this.hexData = Converters.bytesAsHex(data);
        if (type !== 'error') {
            try {
                this.masterRequest = FunctionCodes.newMasterRequest(this.functionCode!, data);
            } catch (e: any) {
                this.masterRequestError = this.getError(e);
            }
            try {
                this.slaveResponse = FunctionCodes.newSlaveResponse(this.functionCode!, data);
            } catch (e: any) {
                this.slaveResponseError = this.getError(e);
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

    getRow(): TableDataColumn[] {
        return [
            new TableDataColumn(Frame.getDateTime(), this.type),
            new TableDataColumn(`${this.slaveAddress} = 0x${Converters.byteToHex(this.slaveAddress!)}`, this.type),
            new TableDataColumn(FunctionCodes.getDescription(this.functionCode), this.type),
            new TableDataColumn(this.getDataLength().toString(), this.type),
            new TableDataColumn(this.getDataAsText(), this.isNoValidDataFormat() ? 'error' : this.type),
            this.type === 'error' ? new TableDataColumn('', this.type) : new TableColumnButton('To send form', () => Dom.sendForm.setFormData(this)),
        ];
    }

    private getDataAsText(): string {
        if (this.type === 'error') {
            return `Invalid frame: 0x${this.hexData}`;
        } else if (this.isUnknownFrame()) {
            return `No strategies to format data field. Raw data field is: 0x${this.hexData}`;
        } else if (this.isNoValidDataFormat()) {
            return `This frame format does not fit to the known function code: masterRequestError=${this.masterRequestError}; slaveResponseError=${this.slaveResponseError}; raw data: 0x${this.hexData}`;
        } else {
            return `Valid frame: masterRequest=${JSON.stringify(this.masterRequest)}; slaveResponse=${JSON.stringify(this.slaveResponse)}`;
        }
    }

    private isNoValidDataFormat(): boolean {
        return !!this.masterRequestError && !!this.slaveResponseError;
    }

    private isUnknownFrame(): boolean {
        return !this.isNoValidDataFormat() && !this.masterRequest && !this.slaveResponse;
    }

    protected getError(e: any): string {
        return e.message;
    }
}
