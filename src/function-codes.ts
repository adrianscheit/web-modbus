import { Converters } from "./converters";
import { AddressBoolean, AddressQuantity, AddressQuantityBooleans, AddressQuantityRegisters, AddressRegister, Booleans, DataFieldStrategy, Exception, Registers } from "./data-field-strategy";

interface FunctionCodeDetails {
    readonly code: number;
    readonly description: string;
    readonly masterRequestStrategy?: DataFieldStrategy;
    readonly slaveResponseStrategy?: DataFieldStrategy;
}

const allFunctionCodeDetails: ReadonlySet<FunctionCodeDetails> = new Set<FunctionCodeDetails>([
    { code: 0x01, description: 'Read Coils', masterRequestStrategy: AddressQuantity, slaveResponseStrategy: Booleans },
    { code: 0x02, description: 'Read Discrete Inputs', masterRequestStrategy: AddressQuantity, slaveResponseStrategy: Booleans },
    { code: 0x03, description: 'Read Holding Registers', masterRequestStrategy: AddressQuantity, slaveResponseStrategy: Registers },
    { code: 0x04, description: 'Read Input Registers', masterRequestStrategy: AddressQuantity, slaveResponseStrategy: Registers },
    { code: 0x05, description: 'Write Single Coil', masterRequestStrategy: AddressBoolean, slaveResponseStrategy: AddressBoolean },
    { code: 0x06, description: 'Write Single Register', masterRequestStrategy: AddressRegister, slaveResponseStrategy: AddressRegister },
    { code: 0x07, description: 'Read Exceptions Status' },
    { code: 0x08, description: 'Diagnostic Test' },
    { code: 0x0f, description: 'Write Multiple Coils', masterRequestStrategy: AddressQuantityBooleans, slaveResponseStrategy: AddressQuantity },
    { code: 0x10, description: 'Write Multiple Registers', masterRequestStrategy: AddressQuantityRegisters, slaveResponseStrategy: AddressQuantity },
    { code: 0x11, description: 'Identify Device Server' },
]);

export type StrategyResult = { object?: Object, error?: string } | undefined;

export class FunctionCodes {
    static descriptions: ReadonlyMap<number, string> = new Map<number, string>([...allFunctionCodeDetails]
        .map((it) => [it.code, it.description])
    );
    static masterRequestStrategies: ReadonlyMap<number, DataFieldStrategy> = new Map<number, DataFieldStrategy>([...allFunctionCodeDetails]
        .filter((it) => it.masterRequestStrategy)
        .map((it) => [it.code, it.masterRequestStrategy!])
    );
    static slaveResponseStrategies: ReadonlyMap<number, DataFieldStrategy> = new Map<number, DataFieldStrategy>([...allFunctionCodeDetails]
        .filter((it) => it.slaveResponseStrategy)
        .map((it) => [it.code, it.slaveResponseStrategy!])
    );

    static getDescription(code: number | undefined): string {
        if (code === undefined) {
            return '';
        }
        const description = this.descriptions.get(code & ~0x80);
        if (description) {
            return this._getDescription(code, description);
        }
        return this._getDescription(code, '(UNKNOWN)');
    }

    private static _getDescription(code: number, description: string): string {
        return `${code} = 0x${Converters.byteToHex(code)} => ${description} ${this.isError(code) ? '(ERROR)' : ''}`;
    }

    static isError(code: number): boolean {
        return !!(code & 0x80);
    }

    static newMasterRequest(code: number, dataFieldBytes: number[]): StrategyResult {
        return this._newDataFieldStrategy(this.masterRequestStrategies.get(code), dataFieldBytes);
    }

    static newSlaveResponse(code: number, dataFieldBytes: number[]): StrategyResult {
        return this._newDataFieldStrategy(code & 0x80 ? Exception : this.slaveResponseStrategies.get(code), dataFieldBytes);
    }

    private static _newDataFieldStrategy(strategy: DataFieldStrategy | undefined, dataFieldBytes: number[]): StrategyResult {
        if (strategy) {
            try {
                return { object: new strategy(dataFieldBytes) };
            } catch (e: any) {
                return { error: e.message };
            }
        }
        return undefined;
    }
}