import {AsciiModeStrategy} from "./ascii-mode-strategy";
import {Converters} from "../converters";
import {ReportType} from "./mode-startegy";

describe('AsciiModeStrategy', () => {
    const validFrame = ':0401000A000DE4\r\n';

    test('accept a valid frame', () => {
        const instance = new AsciiModeStrategy(jest.fn());

        instance.receive(Converters.textAsUInt8Array(validFrame));

        expect(instance.report).toHaveBeenCalledTimes(1);
        expect(instance.report).toHaveBeenCalledWith([0x04, 0x01, 0x00, 0x0A, 0x00, 0x0D], ReportType.valid);
    });

    test('calculates the correct LRC on send', () => {
        const instance = new AsciiModeStrategy(jest.fn());

        let result = instance.send([0x04, 0x01, 0x00, 0x0A, 0x00, 0x0D]);

        expect(result).toEqual(Converters.textAsUInt8Array(validFrame));
        expect(instance.report).toHaveBeenCalledTimes(0);
    });
});