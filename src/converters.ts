export class Converters {
    static byteToHex(value: number): string {
        return value.toString(16).toUpperCase().padStart(2, '0');
    }

    static bytesAsHex(bytes: number[]): string {
        return bytes.map((it) => Converters.byteToHex(it)).join('');
    }

    private static textEncoder = new TextEncoder();

    static textAsUInt8Array(text: string): Uint8Array {
        return this.textEncoder.encode(text);
    }
}