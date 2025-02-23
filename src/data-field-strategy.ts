import {Converters} from "./converters";
import {getInputChecked} from "./dom";

export interface DataFieldStrategy {
    new(data: number[]): any;
}

const toUInt16 = (data: number[], offset: number): number => data[offset] << 8 ^ data[offset + 1];

export class AddressQuantity {
    readonly address: number;
    readonly quantity: number;

    constructor(data: number[]) {
        if (data.length !== 4) {
            throw new Error(`Invalid data format for AddressQuantity!`);
        }
        this.address = toUInt16(data, 0);
        this.quantity = toUInt16(data, 2);
    }
}

export class Booleans {
    static readonly bitsInByte: number[] = [0x80, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01];
    readonly booleans: boolean[];

    constructor(data: number[]) {
        if (data[0] !== data.length - 1) {
            throw new Error(`Invalid data format for Booleans!`);
        }
        this.booleans = data.slice(1).flatMap((byte) => Booleans.bitsInByte.map((bit) => !!(bit & byte)));
    }
}

export class Registers {
    // readonly Uint8?: number[];
    // readonly Int8?: number[];
    // readonly Uint16?: number[];
    // readonly Int16?: number[];
    // readonly Uint32?: number[];
    // readonly Unt32?: number[];
    // readonly Float32?: number[];
    // readonly Float64?: number[];

    constructor(data: number[]) {
        if (data[0] !== data.length - 1 || (data[0] & 0x1) !== 0) {
            throw new Error(`Invalid data format for Registers!`);
        }
        const dataView = new DataView(new Uint8Array(data).buffer);
        this.createEmptyArrayIfValid(dataView, 'Uint', 1);
        this.createEmptyArrayIfValid(dataView, 'Int', 1);
        this.createEmptyArrayIfValid(dataView, 'Uint', 2);
        this.createEmptyArrayIfValid(dataView, 'Int', 2);
        this.createEmptyArrayIfValid(dataView, 'Uint', 4);
        this.createEmptyArrayIfValid(dataView, 'Int', 4);
        this.createEmptyArrayIfValid(dataView, 'Float', 4);
        this.createEmptyArrayIfValid(dataView, 'Float', 8);
    }

    private createEmptyArrayIfValid(dataView: DataView, type: 'Int' | 'Uint' | 'Float', quantityOfBytes: 1 | 2 | 4 | 8): void {
        const dataTypeName = `${type}${quantityOfBytes * 8}`;
        if (getInputChecked(dataTypeName)) {
            const dataViewGetter = `get${dataTypeName}`;
            const resultArray: number[] = [];
            for (let i = 1; i <= dataView.byteLength - quantityOfBytes; i += quantityOfBytes) {
                resultArray.push((dataView as any)[dataViewGetter](i, false));
            }
            (this as any)[dataTypeName] = resultArray;
        }
    }
}

export class AddressBoolean {
    readonly address: number;
    readonly boolean: boolean;

    constructor(data: number[]) {
        if (data.length !== 4) {
            throw new Error(`Invalid data format for WriteSingleBoolean!`);
        }
        this.address = toUInt16(data, 0);
        if (data[2] === 0x00 && data[3] === 0x00) {
            this.boolean = false;
        } else if (data[2] === 0xFF && data[3] === 0x00 || data[2] === 0x00 && data[3] === 0xFF) {
            this.boolean = true;
        } else {
            throw new Error('Invalid data format for single register... Allowed only: 0xFF00, 0x00FF, 0x0000');
        }
    }
}

export class AddressRegister {
    readonly address: number;
    readonly register: number;

    constructor(data: number[]) {
        if (data.length !== 4) {
            throw new Error(`Invalid data format for AddressData!`);
        }
        this.address = toUInt16(data, 0);
        this.register = toUInt16(data, 2);
    }
}

export class AddressQuantityBooleans extends AddressQuantity {
    readonly booleans: Booleans;

    constructor(data: number[]) {
        if (data.length <= 4) {
            throw new Error(`Invalid data format for AddressQuantityBooleans!`);
        }
        super(data.slice(0, 4));
        this.booleans = new Booleans(data.slice(4));
    }
}

export class AddressQuantityRegisters extends AddressQuantity {
    readonly registers: Registers;

    constructor(data: number[]) {
        if (data.length <= 4) {
            throw new Error(`Invalid data format for AddressQuantityRegisters!`);
        }
        super(data.slice(0, 4));
        this.registers = new Registers(data.slice(4));
    }
}

export class Exception {
    static exceptionDescriptions: ReadonlyMap<number, string> = new Map<number, string>([
        [0x01, 'Illegal Function'],
        [0x02, 'Illegal Data Address'],
        [0x03, 'Illegal Data Value'],
        [0x04, 'Server Device Failure'],
        [0x05, 'Acknowledge'],
        [0x06, 'Server Device Busy'],
        [0x07, 'Negative Acknowledge'],
        [0x08, 'Memory Parity Error'],
        [0x10, 'Gateway Path Unavailable'],
        [0x11, 'Gateway Target Device Failed to Respond'],
    ]);
    exceptionCode: number;
    exceptionDescription: string | undefined;

    constructor(data: number[]) {
        if (data.length !== 1) {
            throw new Error('Just on byte of exception code is allowed!');
        }
        this.exceptionCode = data[0];
        this.exceptionDescription = Exception.exceptionDescriptions.get(this.exceptionCode) ??
            `0x${Converters.byteToHex(this.exceptionCode)} => UNKNOWN EXCEPTION CODE`;
    }
}
