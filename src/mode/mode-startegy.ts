import {insertFrameRow} from "../dom";
import {Frame} from "../frame";

export const reportFrame = (frame: Frame): void => {
    insertFrameRow(frame);
};

export interface ModeStrategy {
    receive(data: Uint8Array): void;

    send(bytes: number[]): Uint8Array;
}

