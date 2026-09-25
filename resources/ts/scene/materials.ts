import * as THREE from 'three';

export interface FinishColors {
    front: string;
    worktop: string;
    handle: string;
    floor: string;
}

/** One shared set of materials per finish choice, so a re-plan doesn't leak GPU memory. */
export class Materials {
    readonly front = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0 });
    readonly carcass = new THREE.MeshStandardMaterial({ color: '#efede8', roughness: 0.8 });
    readonly worktop = new THREE.MeshStandardMaterial({ roughness: 0.45 });
    readonly handle = new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.8 });
    readonly plinth = new THREE.MeshStandardMaterial({ roughness: 0.7 });
    readonly steel = new THREE.MeshStandardMaterial({ color: '#c9ccd0', roughness: 0.25, metalness: 0.9 });
    readonly glass = new THREE.MeshStandardMaterial({ color: '#0e0f11', roughness: 0.08, metalness: 0.3 });
    readonly ring = new THREE.MeshStandardMaterial({ color: '#3a3d42', roughness: 0.4 });
    readonly basin = new THREE.MeshStandardMaterial({ color: '#8d9197', roughness: 0.35, metalness: 0.85 });
    readonly wall = new THREE.MeshStandardMaterial({ color: '#ebe7e0', roughness: 0.95, side: THREE.FrontSide });
    readonly floor: THREE.MeshStandardMaterial;
    readonly highlight = new THREE.Color('#3b82f6');

    constructor() {
        this.floor = new THREE.MeshStandardMaterial({ map: plankTexture(), roughness: 0.75 });
    }

    apply(colors: FinishColors): void {
        this.front.color.set(colors.front);
        this.plinth.color.set(colors.front).multiplyScalar(0.8);
        this.worktop.color.set(colors.worktop);
        this.handle.color.set(colors.handle);
        const dark = new THREE.Color(colors.handle).getHSL({ h: 0, s: 0, l: 0 }).l < 0.2;
        this.handle.metalness = dark ? 0.3 : 0.85;
        this.floor.color.set(colors.floor);
    }
}

/**
 * Floor planks drawn on a canvas, so nothing has to be downloaded. Drawn in
 * near-white greys so the floor finish's colour, which tints the texture,
 * decides the wood tone.
 */
function plankTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        const plank = 64;
        for (let row = 0; row < 512 / plank; row++) {
            let x = -((row * 173) % 400);
            while (x < 512) {
                const length = 260 + ((row * 97 + x) % 140);
                const light = 91 + ((row * 31 + x * 7) % 5);
                ctx.fillStyle = `hsl(0, 0%, ${light}%)`;
                ctx.fillRect(x, row * plank, length, plank);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.fillRect(x, row * plank, 2, plank);
                for (let g = 0; g < 6; g++) {
                    ctx.fillStyle = `rgba(0, 0, 0, ${0.04 + (g % 3) * 0.02})`;
                    ctx.fillRect(x, row * plank + 6 + g * 9, length, 1);
                }
                x += length;
            }
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.fillRect(0, row * plank, 512, 2);
        }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;

    return texture;
}
