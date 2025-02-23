import {Converters} from "./converters";
import {Dom, TableColumnButton, TableDataColumn} from "./dom";
import {FunctionCodes, StrategyResult} from "./function-codes";

export class Frame {
    readonly slaveAddress: number;
    readonly functionCode?: number;
    readonly masterRequest?: StrategyResult;
    readonly slaveResponse?: StrategyResult;
    readonly hexData: string;

    constructor(readonly data: number[], readonly type: 'error' | 'send' | '') {
        this.slaveAddress = data.shift()!;
        this.functionCode = data.shift();
        if (this.functionCode === undefined) {
            type = 'error';
        }
        this.hexData = Converters.bytesAsHex(data);
        if (type !== 'error') {
            this.masterRequest = FunctionCodes.newMasterRequest(this.functionCode!, data);
            this.slaveResponse = FunctionCodes.newSlaveResponse(this.functionCode!, data);
        }
    }

    static getDateTime(): string {
        const now = new Date();
        return `${now.toLocaleString()}+${now.getMilliseconds()}ms`;
    }

    private static conditionalText(condition: boolean, value: string): string {
        return condition ? value : '';
    }

    getDataLength(): number {
        return this.data.length;
    }

    getRow(): TableDataColumn[] {
        return [
            new TableDataColumn(`${Frame.getDateTime()} ${this.type}`, this.type),
            new TableDataColumn(`${this.slaveAddress} = 0x${Converters.byteToHex(this.slaveAddress!)}`, this.type),
            new TableDataColumn(FunctionCodes.getDescription(this.functionCode), FunctionCodes.isError(this.functionCode || 0) ? 'error' : this.type),
            new TableDataColumn(this.getDataLength().toString(), this.type),
            new TableDataColumn(this.getDataAsText(), this.isNoValidDataFormat() ? 'error' : this.type),
            this.type === 'error' ? new TableDataColumn('', this.type) : new TableColumnButton('To send form', () => Dom.sendForm.setFormData(this)),
        ];
    }

    protected getError(e: any): string {
        return e.message;
    }

    private getDataAsText(): string {
        if (this.type === 'error') {
            return `Invalid frame: 0x${this.hexData}`;
        } else if (this.isUnknownFunctionCodeStrategy()) {
            return `No strategy to format data field. Raw data field is: 0x${this.hexData}`;
        } else if (this.isNoValidDataFormat()) {
            return `This frame format does not fit to any known strategies: 
            ${Frame.conditionalText(!!this.masterRequest?.error, `masterRequestError=${this.masterRequest?.error}; `)}
            ${Frame.conditionalText(!!this.slaveResponse?.error, `slaveResponseError=${this.slaveResponse?.error}; `)}
            raw data: 0x${this.hexData}`;
        } else {
            return `Valid frame: 
            ${Frame.conditionalText(!!this.masterRequest?.object, `masterRequest=${JSON.stringify(this.masterRequest?.object)}; `)}
            ${Frame.conditionalText(!!this.slaveResponse?.object, `slaveResponse=${JSON.stringify(this.slaveResponse?.object)}; `)}
            `;
        }
    }

    private isUnknownFunctionCodeStrategy(): boolean {
        return !this.masterRequest && !this.slaveResponse;
    }

    private isNoValidDataFormat(): boolean {
        return !this.masterRequest?.object && !this.slaveResponse?.object;
    }
}
