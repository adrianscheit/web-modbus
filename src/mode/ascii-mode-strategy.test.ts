import {AsciiModeStrategy} from "./ascii-mode-strategy";
import {Converters} from "../converters";
import {ReportType} from "./mode-startegy";

describe('AsciiModeStrategy', () => {
    const validFrameBytes = [4, 1, 0, 10, 0, 0x0D];
    const validFrame = `:${Converters.bytesAsHex(validFrameBytes)}E4\r\n`;

    test('accept a valid frame', () => {
        const instance = new AsciiModeStrategy(jest.fn());

        instance.receive(Converters.textAsUInt8Array(validFrame));

        expect(instance.report).toHaveBeenCalledTimes(1);
        expect(instance.report).toHaveBeenCalledWith(validFrameBytes, ReportType.valid);
    });

    test('calculates the correct LRC on send', () => {
        const instance = new AsciiModeStrategy(jest.fn());

        let result = instance.send(validFrameBytes);

        expect(result).toEqual(Converters.textAsUInt8Array(validFrame));
        expect(instance.report).toHaveBeenCalledTimes(0);
    });
});