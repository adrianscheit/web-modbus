import { getFunctionCodeDescription } from "./function-codes";

const toUInt16 = (data: number[], offset: number): number => data[offset] << 8 ^ data[offset + 1];

class DataAddressQuantity {
    address: number;
    quantity: number;

    constructor(data: number[]) {
        if (data.length !== 4) {
            throw new Error(`Invalid data format for DataAddressQuantity! ${JSON.stringify(data)}`);
        }
        this.address = toUInt16(data, 0);
        this.quantity = toUInt16(data, 2);
    }
}

class DataBooleans {
    static readonly bitsInByte: number[] = [0x80, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01];
    onOff: boolean[];

    constructor(data: number[]) {
        if (data[0] !== data.length - 1) {
            throw new Error(`Invalid data format for DataBooleans! ${JSON.stringify(data)}`);
        }
        this.onOff = data.slice(1).flatMap((byte) => DataBooleans.bitsInByte.map((bit) => !!(bit & byte)));
    }
}

class DataRegisters {
    uInt16: number[] = [];
    int16: number[] = [];
    float32?: number[];
    uInt32?: number[];
    int32?: number[];

    constructor(data: number[]) {
        if (data[0] !== data.length - 1 || (data[0] & 0x1) !== 0) {
            throw new Error(`Invalid data format for DataRegisters! ${JSON.stringify(data)}`);
        }
        const dataView = new DataView(new Uint8Array(data).buffer);
        for (let i = 1; i < data.length; i += 2) {
            this.uInt16.push(dataView.getUint16(i, false));
            this.int16.push(dataView.getInt16(i, false));
        }
        if ((data[0] & 0x3) === 0 && data[0] >= 4) {
            this.float32 = [];
            this.uInt32 = [];
            this.int32 = [];
            for (let i = 1; i < data.length; i += 4) {
                this.float32.push(dataView.getFloat32(i, false));
                this.uInt32.push(dataView.getUint32(i, false));
                this.int32.push(dataView.getInt32(i, false));
            }
        }
    }
}

class DataWriteSingleBoolean {
    address: number;
    onOff: boolean;
    constructor(data: number[]) {
        if (data.length !== 4) {
            throw new Error(`Invalid data format for DataRegisters! ${JSON.stringify(data)}`);
        }
        this.address = toUInt16(data, 0);
        this.onOff = !!data[2] || !!data[3];
    }
}

class DataAddressData {
    address: number;
    data: number;

    constructor(data: number[]) {
        if (data.length !== 4) {
            throw new Error(`Invalid data format for DataAddressQuantity! ${JSON.stringify(data)}`);
        }
        this.address = toUInt16(data, 0);
        this.data = toUInt16(data, 2);
    }
}

class DataAddressQuantityBooleans {
    readonly dataAddressQuantity: DataAddressQuantity;
    readonly dataBooleans: DataBooleans;

    constructor(data: number[]) {
        if (data.length <= 4) {
            throw new Error(`Invalid data format for DataAddressQuantity! ${JSON.stringify(data)}`);
        }
        this.dataAddressQuantity = new DataAddressQuantity(data.slice(0, 4));
        this.dataBooleans = new DataBooleans(data.slice(4));
    }
}

class DataAddressQuantityRegisters {
    readonly dataAddressQuantity: DataAddressQuantity;
    readonly dataRegisters: DataRegisters;

    constructor(data: number[]) {
        if (data.length <= 4) {
            throw new Error(`Invalid data format for DataAddressQuantity! ${JSON.stringify(data)}`);
        }
        this.dataAddressQuantity = new DataAddressQuantity(data.slice(0, 4));
        this.dataRegisters = new DataRegisters(data.slice(4));
    }
}

const functionFrameFormats: { [code: number]: { new(data: number[]): any }[] } = {
    0x01: [DataAddressQuantity, DataBooleans],
    0x02: [DataAddressQuantity, DataBooleans],
    0x03: [DataAddressQuantity, DataRegisters],
    0x04: [DataAddressQuantity, DataRegisters],
    0x05: [DataWriteSingleBoolean],
    0x06: [DataAddressData],
    0x0f: [DataAddressQuantityBooleans, DataAddressQuantity],
    0x10: [DataAddressQuantityRegisters, DataAddressQuantity],
};

export class Frame {
    readonly slaveAddress: number;
    readonly functionCode: number;
    readonly functionDescription: string;
    readonly specificFormats: any[] = [];

    constructor(readonly data: number[]) {
        // if (data.length < 2) {
        //     throw new Error(`Too few data for Modbus frame! ${JSON.stringify(data)}`);
        // }
        this.slaveAddress = data.shift()!;
        this.functionCode = data.shift()!;
        this.functionDescription = getFunctionCodeDescription(this.functionCode);
        const specificFormat = functionFrameFormats[this.functionCode];
        if (specificFormat) {
            const errors: any[] = [];
            for (const format of specificFormat) {
                try {
                    this.specificFormats.push(new format(data));
                } catch (e: any) {
                    errors.push(e?.message || e);
                }
            }
            if (!this.specificFormats.length) {
                this.specificFormats = errors;
            }
        }
    }
}
