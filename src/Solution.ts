import * as THREE from 'three';

export type SolutionType = 'mezcla' | 'dilución' | 'medio' | 'cultivo' | 'precultivo';

export class Solution {
  type: SolutionType;
  concentration: number;
  millilitres: number;

  constructor(type: SolutionType, concentration = 1, millis: number = Infinity) {
    this.type = type;
    this.concentration = concentration;
    this.millilitres = millis;
  }

  get color(): THREE.Color {
    if (this.type == 'medio') return new THREE.Color(0xffffff);
    else if (this.type == 'cultivo' || this.type == 'precultivo') return new THREE.Color(0xf2cc24);
    else if (this.type == 'dilución') return new THREE.Color(0xf2cc88);
    else if (this.type == 'mezcla') return new THREE.Color(0x33333388);
    else return undefined;
  }

  mix(other: Solution) {
    if (this.type == other.type) {
      if (this.concentration != other.concentration)
        // TODO: Fix this
        this.concentration = Math.max(this.concentration, other.concentration);
    } else {
      if (Solution.oneIs('dilución', this, other)) {
        this.dilute(other);
      } else if (Solution.mixingWith('precultivo', 'medio', this, other)) {
        const medium = this.type == 'medio' ? this : other;
        medium.type = 'cultivo';
      } else {
        this.type = 'mezcla';
      }
    }

    const totalMillis = this.millilitres + other.millilitres;
    this.millilitres = totalMillis;
  }

  clone() {
    return new Solution(this.type, this.concentration, this.millilitres);
  }

  equals(other: Solution) {
    return this.type == other.type && this.concentration == other.concentration;
  }

  toString() {
    const volume = Number.isFinite(this.millilitres) ? ` (${this.millilitres}ml)` : '';
    const concentrationStr = this.concentration != 1 ? `a 10^${Math.log10(this.concentration)}` : '(puro)';
    return `Solución '${this.type}'${volume} ${concentrationStr}`;
  }

  private static oneIs(type: SolutionType, solutionA: Solution, solutionB: Solution): boolean {
    return solutionA.type == type || solutionB.type == type;
  }

  private static mixingWith(type1: SolutionType, type2: SolutionType, solA: Solution, solB: Solution): boolean {
    return (solA.type == type1 && solB.type == type2) || (solA.type == type2 && solB.type == type1);
  }

  private dilute(other: Solution) {
    const totalMillis = this.millilitres + other.millilitres;

    if (this.type == 'dilución') {
      const newConcentration = (other.concentration * other.millilitres) / totalMillis;
      this.concentration = newConcentration;
      this.type = other.type;
    } else if (other.type == 'dilución') {
      const newConcentration = (this.concentration * this.millilitres) / totalMillis;
      this.concentration = newConcentration;
    }
  }
}
