type DirEnt = { type: 'file' | 'directory'; name: string; children?: Map<string, DirEnt>; data?: string };
const root: Map<string, DirEnt> = new Map();

function split(p: string) { return p.replace(/^\/+/, '').split('/').filter(Boolean); }
function getDir(path: string, make = false): Map<string, DirEnt> {
    let cur = root;
    for (const part of split(path)) {
        const ent = cur.get(part);
        if (!ent) {
            if (!make) throw new Error('ENOENT');
            const dir: DirEnt = { type: 'directory', name: part, children: new Map() };
            cur.set(part, dir);
            cur = dir.children!;
        } else {
            if (ent.type !== 'directory') throw new Error('ENOTDIR');
            cur = ent.children!;
        }
    }
    return cur;
}
function writeFileAt(path: string, data: string) {
    const parts = split(path); const name = parts.pop()!;
    const dir = getDir(parts.join('/'), true);
    dir.set(name, { type: 'file', name, data });
}
function readFileAt(path: string): string {
    const parts = split(path); const name = parts.pop()!;
    const dir = getDir(parts.join('/'), false);
    const ent = dir.get(name);
    if (!ent || ent.type !== 'file') throw new Error('ENOENT');
    return ent.data || '';
}
function readdirAt(path: string) {
    const dir = getDir(path, false);
    return Array.from(dir.values()).map(e => ({ name: e.name, type: e.type }));
}
function rmtree(path: string) {
    const parts = split(path);
    if (!parts.length) { root.clear(); return; }
    const name = parts.pop()!;
    const dir = getDir(parts.join('/'), false);
    dir.delete(name);
}

export enum Directory { Data = 'data' }
export enum Encoding { UTF8 = 'utf8', BASE64 = 'base64' }

export const Filesystem = {
    mkdir: async ({ path }: { path: string }) => { getDir(path, true); return { uri: path }; },
    writeFile: async ({ path, data }: { path: string; data: string }) => { writeFileAt(path, data); return { uri: path }; },
    readFile: async ({ path }: { path: string }) => { return { data: readFileAt(path) }; },
    readdir: async ({ path }: { path: string }) => { return { files: readdirAt(path) }; },
    rmdir: async ({ path }: { path: string }) => { rmtree(path); return; }
};

// make ESM default consumers happy too
export default { Filesystem, Directory, Encoding };