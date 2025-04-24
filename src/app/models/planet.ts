export interface Planet {
  data?: {
    name?: string;
    color?: string | number;
    size?: number;
    speed?: number;
    distance?: number;
    perihelion?: number;
    aphelion?: number;
    semimajorAxis?: number;
    eccentricity?: number;
    axialTilt?: number;
    angle?: number;
    sideralOrbit?: number;
    mass?: {
      value: number;
      exponent: number;
    };
  },
  mesh?: any;
  orbitLine?: any;
  spotLight?: any;
}