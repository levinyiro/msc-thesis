export interface Planet {
    name?: string;
    englishName?: string;
    perihelion?: any;
    aphelion?: any;
    eccentricity?: any;
    color?: any;
    axialTilt?: any;
    size?: number;
    semimajorAxis?: any;
    speed?: any;
    mesh?: any;
    angle?: number;
    sideralOrbit?: any;
    distance?: any;
    mass?: {
      massValue: number;
      massExponent: number;
    };
}  