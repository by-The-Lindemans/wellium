/// <reference types="node" />
import EventEmitter from 'events';
import type { CapacitorElectronConfig } from './definitions';
declare class CapElectronEmitter extends EventEmitter {
}
export declare const CapElectronEventEmitter: CapElectronEmitter;
export declare function deepMerge(target: any, _objects?: any[]): any;
export declare function pick<T>(object: Record<string, T>, keys: string[]): Record<string, T>;
export declare function deepClone<T>(object: Record<string, T>): Record<string, T>;
export declare function setupCapacitorElectronPlugins(): void;
export declare function encodeFromFile(filePath: string): Promise<string>;
export declare function getCapacitorElectronConfig(): CapacitorElectronConfig;
export {};
