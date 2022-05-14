export interface DataField {
    new(data: number[]): any;
}

const toUInt16 = (data: number[], offset: number): number => data[offset] << 8 ^ data[offset + 1];

class DataAddressQuantity {
    readonly address: number;
    readonly quantity: number;

    constructor(data: number[]) {
        if (data.length !== 4) {
            throw new Error(`Invalid data format for DataAddressQuantity!`);
        }
        this.address = toUInt16(data, 0);
        this.quantity = toUInt16(data, 2);
    }
}

class DataBooleans {
    static readonly bitsInByte: number[] = [0x80, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01];
    readonly onOff: boolean[];

    constructor(data: number[]) {
        if (data[0] !== data.length - 1) {
            throw new Error(`Invalid data format for DataBooleans!`);
        }
        this.onOff = data.slice(1).flatMap((byte) => DataBooleans.bitsInByte.map((bit) => !!(bit & byte)));
    }
}

class DataRegisters {
    readonly uInt16: number[] = [];
    readonly int16: number[] = [];
    readonly float32?: number[];
    readonly uInt32?: number[];
    readonly int32?: number[];

    constructor(data: number[]) {
        if (data[0] !== data.length - 1 || (data[0] & 0x1) !== 0) {
            throw new Error(`Invalid data format for DataRegisters!`);
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
    readonly address: number;
    readonly onOff: boolean;

    constructor(data: number[]) {
        if (data.length !== 4) {
            throw new Error(`Invalid data format for DataWriteSingleBoolean!`);
        }
        this.address = toUInt16(data, 0);
        if (data[2] === 0x00 && data[3] === 0x00) {
            this.onOff = false;
        } else if (data[2] === 0xFF && data[3] === 0x00 || data[2] === 0x00 && data[3] === 0xFF) {
            this.onOff = true;
        } else {
            throw new Error('Invalid data format for single register... Allowed only: 0xFF00, 0x00FF, 0x0000');
        }
    }
}

class DataAddressData {
    readonly address: number;
    readonly data: number;

    constructor(data: number[]) {
        if (data.length !== 4) {
            throw new Error(`Invalid data format for DataAddressData!`);
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
            throw new Error(`Invalid data format for DataAddressQuantityBooleans!`);
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
            throw new Error(`Invalid data format for DataAddressQuantityRegisters!`);
        }
        this.dataAddressQuantity = new DataAddressQuantity(data.slice(0, 4));
        this.dataRegisters = new DataRegisters(data.slice(4));
    }
}

interface DataFieldFormats {
    fromMasterToSlave: DataField;
    fromSlaveToMaster: DataField;
}

export const dataFieldStrategies: { [code: number]: DataFieldFormats } = {
    0x01: { fromMasterToSlave: DataAddressQuantity, fromSlaveToMaster: DataBooleans },
    0x02: { fromMasterToSlave: DataAddressQuantity, fromSlaveToMaster: DataBooleans },
    0x03: { fromMasterToSlave: DataAddressQuantity, fromSlaveToMaster: DataRegisters },
    0x04: { fromMasterToSlave: DataAddressQuantity, fromSlaveToMaster: DataRegisters },
    0x05: { fromMasterToSlave: DataWriteSingleBoolean, fromSlaveToMaster: DataWriteSingleBoolean },
    0x06: { fromMasterToSlave: DataAddressData, fromSlaveToMaster: DataAddressData },
    0x0f: { fromMasterToSlave: DataAddressQuantityBooleans, fromSlaveToMaster: DataAddressQuantity },
    0x10: { fromMasterToSlave: DataAddressQuantityRegisters, fromSlaveToMaster: DataAddressQuantity },
};
