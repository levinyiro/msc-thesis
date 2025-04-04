export interface PlanetOrbitData {
    name?: string;
    perihelion: number;
    aphelion: number;
    eccentricity: number;
    color?: number;
    axialTilt?: number;
    size?: number;
    semimajorAxis?: number;
    mass?: {
      massValue: number;
      massExponent: number;
    };
}  