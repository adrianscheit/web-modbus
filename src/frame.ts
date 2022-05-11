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
            throw new Error(`Invalid data format for DataWriteSingleBoolean! ${JSON.stringify(data)}`);
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
    address: number;
    data: number;

    constructor(data: number[]) {
        if (data.length !== 4) {
            throw new Error(`Invalid data format for DataAddressData! ${JSON.stringify(data)}`);
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
            throw new Error(`Invalid data format for DataAddressQuantityBooleans! ${JSON.stringify(data)}`);
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
            throw new Error(`Invalid data format for DataAddressQuantityRegisters! ${JSON.stringify(data)}`);
        }
        this.dataAddressQuantity = new DataAddressQuantity(data.slice(0, 4));
        this.dataRegisters = new DataRegisters(data.slice(4));
    }
}

class DataForbidden {
    constructor(data: number[]) {
        throw new Error(`Not possible`);
    }
}

interface FunctionFormats {
    fromMasterToSlave: FrameDetails;
    fromSlaveToMaster: FrameDetails;
}

type FrameDetails = { new(data: number[]): any };
const functionFrameFormats: { [code: number]: FunctionFormats } = {
    0x01: { fromMasterToSlave: DataAddressQuantity, fromSlaveToMaster: DataBooleans },
    0x02: { fromMasterToSlave: DataAddressQuantity, fromSlaveToMaster: DataBooleans },
    0x03: { fromMasterToSlave: DataAddressQuantity, fromSlaveToMaster: DataRegisters },
    0x04: { fromMasterToSlave: DataAddressQuantity, fromSlaveToMaster: DataRegisters },
    0x05: { fromMasterToSlave: DataWriteSingleBoolean, fromSlaveToMaster: DataWriteSingleBoolean },
    0x06: { fromMasterToSlave: DataAddressData, fromSlaveToMaster: DataAddressData },
    0x0f: { fromMasterToSlave: DataAddressQuantityBooleans, fromSlaveToMaster: DataAddressQuantity },
    0x10: { fromMasterToSlave: DataAddressQuantityRegisters, fromSlaveToMaster: DataAddressQuantity },
};

export class Frame {
    readonly slaveAddress: number;
    readonly functionCode: number;
    readonly fromMasterToSlave?: any;
    readonly fromSlaveToMaster?: any;

    constructor(readonly data: number[]) {
        this.slaveAddress = data.shift()!;
        this.functionCode = data.shift()!;
        const specificFormat = functionFrameFormats[this.functionCode];
        if (specificFormat) {
            try {
                this.fromMasterToSlave = new specificFormat.fromMasterToSlave(data);
            } catch (e: any) {
                this.fromMasterToSlave = e.message;
            }
            try {
                this.fromSlaveToMaster = new specificFormat.fromSlaveToMaster(data);
            } catch (e: any) {
                this.fromSlaveToMaster = e.message;
            }
        }
    }
}
