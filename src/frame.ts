import { dataFieldStrategies } from "./data-field";

export class Frame {
    readonly slaveAddress: number;
    readonly functionCode: number;
    readonly fromMasterToSlave?: any;
    readonly fromSlaveToMaster?: any;
    readonly fromMasterToSlaveError?: string;
    readonly fromSlaveToMasterError?: string;

    constructor(readonly data: number[]) {
        this.slaveAddress = data.shift()!;
        this.functionCode = data.shift()!;
        const specificFormat = dataFieldStrategies[this.functionCode];
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

    isNoValidDataFormat(): boolean {
        return !!this.fromMasterToSlaveError && !!this.fromSlaveToMasterError;
    }

    protected getError(e: any): string {
        return `${e.message}`;
    }
}
