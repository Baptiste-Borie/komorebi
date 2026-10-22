// Inline vectors keep the toolbar legible without relying on emoji/CJK fonts.
const paths: Record<string, string> = {
 tree: '<path d="M12 21v-6m-5 0h10a4 4 0 0 0 2-7 5 5 0 0 0-14 0 4 4 0 0 0 2 7Z"/>',
 sapling: '<path d="M12 21V9m0 7C5 16 4 12 4 9c5 0 8 2 8 7Zm0-4c0-6 3-9 8-9 0 6-3 9-8 9Z"/>',
 bush: '<path d="M5 19a4 4 0 0 1-2-7 4 4 0 0 1 6-5 4 4 0 0 1 7 1 5 5 0 0 1 3 9c-3 3-10 3-14 2Z"/>',
 flower: '<circle cx="12" cy="10" r="2"/><path d="M10 8c-5-7 9-7 4 0 8-3 7 9 0 4 3 8-9 8-4 0-8 4-8-8 0-4Zm2 7v7m0-3 5-3"/>',
 rock: '<path d="m3 16 3-8 7-5 7 7 1 8-9 3-9-5Zm3-8 6 7 8-5m-8 5v6"/>',
 pond: '<path d="M3 7c3-4 5 4 9 0s6 4 9 0M3 12c3-4 5 4 9 0s6 4 9 0M3 17c3-4 5 4 9 0s6 4 9 0"/>',
 fern: '<path d="m5 21 11-18M7 18l-3-5m6 1-4-5m7 1-3-5m-3 13 6-1m-3-3 6-1m-3-3 6-1"/>',
 home: '<circle cx="12" cy="12" r="6"/><path d="M12 2v6m0 8v6M2 12h6m8 0h6"/>',
 focus: '<path d="M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6"/>',
 menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
 density: '<path d="M5 21v-5m9 5v-6M2 16l3-9 4 9H2Zm8-1 4-12 5 12h-9Z"/>',
};
export function icon(name: string) {
 return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]??paths.sapling}</svg>`;
}
