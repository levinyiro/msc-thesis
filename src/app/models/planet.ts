export interface Planet {
  data?: {
    name?: string;
    color?: string | number;
    size?: number;
    speed?: number;
    distance?: number;
    perihelion?: number;
    aphelion?: number;
    eccentricity?: number;
    axialTilt?: number;
    semimajorAxis?: number;
    angle?: number;
    sideralOrbit?: number;
    mass?: {
      massValue: number;
      massExponent: number;
    };
  },
  mesh?: any;
  orbitLine?: any;
  spotLight?: any;
}