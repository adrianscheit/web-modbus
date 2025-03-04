import {Converters} from "./converters";
import {RtuModeStrategy} from "./mode/rtu-mode-strategy";
import {AsciiModeStrategy} from "./mode/ascii-mode-strategy";

export const intTest = (): void => {
    new RtuModeStrategy(() => {
    }, 300).receive(new Uint8Array([
        0x11, 0x22, 0x33, 0x44, 0x55, // some mess
        0x04, 0x01, 0x00, 0x0A, 0x00, 0x0D, 0xdd, 0x98, // valid: address & quantity
        0xFF, 0xFF, // valid CRC but invalid frame
        0x11, 0x22, 0x33, 0x44, 0x55, // some mess
        0x11, 0x0f, 0x00, 0x13, 0x00, 0x0A, 0x02, 0xCD, 0x01, 0xBF, 0x0b, // Valid booleans
        0x01, 0x03, 0x08, 0x41, 0x20, 0x00, 0x00, 0x42, 0xC8, 0x00, 0x00, 0xE4, 0x6F, // valid: expected 10 100 float32
        0x01, 0x10, 0x0F, 0xA3, 0x00, 0x02, 0x04, 0x00, 0x14, 0x07, 0xD0, 0xBB, 0x9A, // valid: expected uint16  20, 2000
    ]));

    new AsciiModeStrategy(() => {
    },).receive(Converters.textAsUInt8Array(
        '&*^&^%^%$*&&%%$#' + // simply totally invalid frame
        ':0401000A000DE4\r\n' + // valid: address & quantity
        'xyz!@=$%#$;' + // simply totally invalid frame
        ':0401000A0DE4\r\n' +  // valid LRC, but bad frame format
        ':0401000A000D00\r\n'  // bad LRC
    ));
}
