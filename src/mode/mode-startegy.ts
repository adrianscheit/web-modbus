export enum ReportType {
    valid = '',
    errored = 'error',
    sent = 'send',
}

export interface ModeStrategy {
    receive(data: Uint8Array): void;

    send(bytes: number[]): Uint8Array;

    report(bytes: number[], type: ReportType): void;
}

