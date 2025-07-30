import { CapacitorStorageAdapter } from './storageAdapterCapacitor';
import { TextEncoder, TextDecoder } from 'util';
import { jest } from '@jest/globals';

jest.mock('@capacitor/filesystem');

function u8(...nums: number[]) { return new Uint8Array(nums); }

describe('CapacitorStorageAdapter feed', () => {
    it('appends chunks and iterates in order', async () => {
        const store = new CapacitorStorageAdapter();
        await store.appendChunk('roomA', u8(1, 2));
        await store.appendChunk('roomA', u8(3));
        await store.appendChunk('roomA', u8(4, 5));

        const out: number[][] = [];
        for await (const chunk of store.iterChunks('roomA')) out.push([...chunk]);
        expect(out).toEqual([[1, 2], [3], [4, 5]]);
    });

    it('seeks from an index', async () => {
        const store = new CapacitorStorageAdapter();
        const out: number[][] = [];
        for await (const chunk of store.iterChunks('roomA', { from: 1 })) out.push([...chunk]);
        expect(out).toEqual([[3], [4, 5]]);
    });
});
