/**
 * CityWorld defines the layout, buildings, road network, and collision boundaries
 * for the Free Roam City open-world sandbox.
 */

export interface Building {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: string;
  roofColor: string;
  windowRows: number;
  windowCols: number;
}

export interface StreetLight {
  x: number;
  z: number;
}

export class CityWorld {
  public static readonly WORLD_SIZE = 1200; // units
  public static readonly BLOCK_SIZE = 120;
  public static readonly ROAD_WIDTH = 26;

  public readonly buildings: Building[] = [];
  public readonly streetLights: StreetLight[] = [];

  constructor() {
    this.generateCity();
  }

  private generateCity(): void {
    const numBlocks = 6;
    const startCoord = -((numBlocks * (CityWorld.BLOCK_SIZE + CityWorld.ROAD_WIDTH)) / 2);

    const buildingPalettes = [
      { wall: '#1e293b', roof: '#0f172a' }, // Deep slate tower
      { wall: '#27272a', roof: '#18181b' }, // Dark graphite high-rise
      { wall: '#334155', roof: '#1e293b' }, // Modern glass corporate
      { wall: '#1c1917', roof: '#0c0a09' }, // Stone architectural
      { wall: '#3f3f46', roof: '#27272a' }, // Steel concrete
      { wall: '#18181b', roof: '#09090b' }, // Obsidian skyscraper
    ];

    for (let bx = 0; bx < numBlocks; bx++) {
      for (let bz = 0; bz < numBlocks; bz++) {
        // Skip center square for a downtown grand plaza / monument
        if ((bx === 2 || bx === 3) && (bz === 2 || bz === 3)) {
          continue;
        }

        const blockCenterX = startCoord + bx * (CityWorld.BLOCK_SIZE + CityWorld.ROAD_WIDTH) + CityWorld.BLOCK_SIZE / 2;
        const blockCenterZ = startCoord + bz * (CityWorld.BLOCK_SIZE + CityWorld.ROAD_WIDTH) + CityWorld.BLOCK_SIZE / 2;

        // Subdivide block into 2x2 or single large tower
        const isSkyscraper = Math.abs(bx - 2.5) <= 1.5 && Math.abs(bz - 2.5) <= 1.5;
        const palette = buildingPalettes[(bx * 7 + bz * 13) % buildingPalettes.length];

        if (isSkyscraper) {
          // Skyscraper
          const height = 90 + ((bx * 31 + bz * 17) % 80);
          this.buildings.push({
            x: blockCenterX,
            z: blockCenterZ,
            width: CityWorld.BLOCK_SIZE * 0.75,
            depth: CityWorld.BLOCK_SIZE * 0.75,
            height,
            color: palette.wall,
            roofColor: palette.roof,
            windowRows: Math.floor(height / 6),
            windowCols: 6,
          });
        } else {
          // Smaller commercial buildings
          const subWidth = CityWorld.BLOCK_SIZE * 0.38;
          const subDepth = CityWorld.BLOCK_SIZE * 0.38;
          const offsets = [-CityWorld.BLOCK_SIZE * 0.22, CityWorld.BLOCK_SIZE * 0.22];

          for (const ox of offsets) {
            for (const oz of offsets) {
              const height = 24 + ((bx * 19 + bz * 23 + ox) % 36);
              this.buildings.push({
                x: blockCenterX + ox,
                z: blockCenterZ + oz,
                width: subWidth,
                depth: subDepth,
                height: Math.abs(height),
                color: palette.wall,
                roofColor: palette.roof,
                windowRows: 4,
                windowCols: 3,
              });
            }
          }
        }

        // Street lights on corners
        this.streetLights.push({ x: blockCenterX - CityWorld.BLOCK_SIZE / 2 - 2, z: blockCenterZ - CityWorld.BLOCK_SIZE / 2 - 2 });
        this.streetLights.push({ x: blockCenterX + CityWorld.BLOCK_SIZE / 2 + 2, z: blockCenterZ + CityWorld.BLOCK_SIZE / 2 + 2 });
      }
    }
  }

  /**
   * Resolves collision with city buildings.
   * Returns corrected x, z coordinates and true if collision occurred.
   */
  public checkBuildingCollision(
    px: number,
    pz: number,
    radius = 2.5
  ): { x: number; z: number; collided: boolean } {
    let correctedX = px;
    let correctedZ = pz;
    let collided = false;

    // Check bounds of city
    const halfWorld = CityWorld.WORLD_SIZE / 2 - 10;
    if (correctedX < -halfWorld) { correctedX = -halfWorld; collided = true; }
    if (correctedX > halfWorld) { correctedX = halfWorld; collided = true; }
    if (correctedZ < -halfWorld) { correctedZ = -halfWorld; collided = true; }
    if (correctedZ > halfWorld) { correctedZ = halfWorld; collided = true; }

    for (const b of this.buildings) {
      const halfW = b.width / 2 + radius;
      const halfD = b.depth / 2 + radius;

      const minX = b.x - halfW;
      const maxX = b.x + halfW;
      const minZ = b.z - halfD;
      const maxZ = b.z + halfD;

      if (correctedX >= minX && correctedX <= maxX && correctedZ >= minZ && correctedZ <= maxZ) {
        collided = true;
        // Determine closest edge to push out
        const distLeft = Math.abs(correctedX - minX);
        const distRight = Math.abs(correctedX - maxX);
        const distTop = Math.abs(correctedZ - minZ);
        const distBottom = Math.abs(correctedZ - maxZ);

        const minDist = Math.min(distLeft, distRight, distTop, distBottom);
        if (minDist === distLeft) correctedX = minX;
        else if (minDist === distRight) correctedX = maxX;
        else if (minDist === distTop) correctedZ = minZ;
        else correctedZ = maxZ;
      }
    }

    return { x: correctedX, z: correctedZ, collided };
  }
}
