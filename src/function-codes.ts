import { Converters } from "./converters";
import { DataField } from "./data-field";

interface FunctionCodeDetails {
    readonly code: number;
    readonly description: string;
    readonly masterRequestStrategy?: DataField;
    readonly slaveResponseStrategy?: DataField;
}

const allFunctionCodeDetails: ReadonlySet<FunctionCodeDetails> = new Set<FunctionCodeDetails>([
    { code: 0x01, description: 'Read Coils' },
    { code: 0x02, description: 'Read Discrete Inputs' },
    { code: 0x03, description: 'Read Holding Registers' },
    { code: 0x04, description: 'Read Input Registers' },
    { code: 0x05, description: 'Write Single Coil' },
    { code: 0x06, description: 'Write Single Register' },
    { code: 0x07, description: 'Read Exceptions Status' },
    { code: 0x08, description: 'Diagnostic Test' },
    { code: 0x0f, description: 'Write Multiple Coils' },
    { code: 0x10, description: 'Write Multiple Registers' },
    { code: 0x11, description: 'Identify Device Server' },
    { code: 0x81, description: 'Illegal Function' },
    { code: 0x82, description: 'Illegal Data Address' },
    { code: 0x83, description: 'Illegal Data Value' },
    { code: 0x84, description: 'Server Device Failure' },
    { code: 0x85, description: 'Acknowledge' },
    { code: 0x86, description: 'Server Device Busy' },
    { code: 0x87, description: 'Negative Acknowledge' },
    { code: 0x88, description: 'Memory Parity Error' },
    { code: 0x90, description: 'Gateway Path Unavailable' },
    { code: 0x91, description: 'Gateway Target Device Failed to Respond' },
]);

export class FunctionCodes {
    static descriptions: ReadonlyMap<number, string> = new Map<number, string>([...allFunctionCodeDetails].map((it) => [it.code, it.description]));

    static getDescription(code: number | undefined): string {
        if (code === undefined) {
            return '';
        }
        const description = this.descriptions.get(code);
        if (description) {
            return this._getDescription(code, description);
        }
        return this._getDescription(code, '<UNKNOWN>');
    }

    private static _getDescription(code: number, description: string): string {
        return `${code} = 0x${Converters.byteToHex(code)} => ${description} ${this.isError(code) ? '(ERROR)' : ''}`;
    }

    static isError(code: number): boolean {
        return !!(code & 0x80);
    }
}