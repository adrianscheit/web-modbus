import { Converters } from "./converters";

export const functionCodes: { [code: number]: string } = {
    0x01: 'Read Coils',
    0x02: 'Read Discrete Inputs',
    0x03: 'Read Holding Registers',
    0x04: 'Read Input Registers',
    0x05: 'Write Single Coil',
    0x06: 'Write Single Register',
    0x07: 'Read Exceptions Status',
    0x08: 'Diagnostic Test',
    0x0f: 'Write Multiple Coils',
    0x10: 'Write Multiple Registers',
    0x11: 'Identify Device Server',
};

export const errorCodes: { [code: number]: string } = {
    0x81: 'Illegal Function',
    0x82: 'Illegal Data Address',
    0x83: 'Illegal Data Value',
    0x84: 'Server Device Failure',
    0x85: 'Acknowledge',
    0x86: 'Server Device Busy',
    0x87: 'Negative Acknowledge',
    0x88: 'Memory Parity Error',
    0x90: 'Gateway Path Unavailable',
    0x91: 'Gateway Target Device Failed to Respond',
};


export const getFunctionCodeDescription = (code: number): string => {
    const description = functionCodes[code] ?? errorCodes[code];
    if (description) {
        return `0x${Converters.byteToHex(code)} ${description}`;
    }
    return `0x${Converters.byteToHex(code)} UNKNOWN`;
}
