import {insertFrameRow} from "../dom";
import {Frame} from "../frame";

export const reportFrame = (frame: Frame): void => {
    insertFrameRow(frame);
};

export abstract class ModeStrategy {
    abstract receive(data: Uint8Array): void;

    abstract send(bytes: number[]): Uint8Array;
}

