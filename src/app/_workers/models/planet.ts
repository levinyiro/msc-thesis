export interface Planet {
    name?: string;
    englishName?: string;
    perihelion: number;
    aphelion: number;
    eccentricity: number;
    color?: number;
    axialTilt?: number;
    size?: number;
    semimajorAxis?: number;
    speed?: any;
    mesh?: any;
    angle?: number;
    mass?: {
      massValue: number;
      massExponent: number;
    };
}  