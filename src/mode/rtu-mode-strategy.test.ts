import {RtuModeStrategy} from "./rtu-mode-strategy";
import {ReportType} from "./mode-startegy";

describe('RtuModeStrategy', () => {
    const validFrame = [0x04, 0x01, 0x00, 0x0A, 0x00, 0x0D, 0xdd, 0x98];

    test('extract data from valid frame', () => {
        const instance = new RtuModeStrategy(jest.fn(), 1000);

        instance.receive(new Uint8Array(validFrame));

        expect(instance.report).toHaveBeenCalledTimes(1);
        expect(instance.report).toHaveBeenCalledWith(validFrame.slice(0, -2), ReportType.valid);
    });

    test('prepares the right CRC on send', () => {
        const instance = new RtuModeStrategy(jest.fn(), 1000);

        let result = instance.send(validFrame.slice(0, -2));

        expect(result).toEqual(new Uint8Array(validFrame));
        expect(instance.report).toHaveBeenCalledTimes(0);
    });
});