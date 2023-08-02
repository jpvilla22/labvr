export type XRRemappedGamepad = {
  hapticActuators: {
    pulse: (intensity: number /* 0 to 1 */, millis: number) => void;
  }[];
};
