import { Solution } from '../Solution';
import { SimpleLabObject } from './SimpleLabObject';

export class ContainerObject extends SimpleLabObject {
  readonly isContainer = true;

  solution?: Solution;
  isOpened: boolean = false;

  extractSolution(ml: number): Solution {
    if (!this.solution) return undefined;

    const extraction = this.solution.clone();
    extraction.millilitres = Math.min(ml, this.solution.millilitres);
    this.solution.millilitres -= extraction.millilitres;

    if (this.solution.millilitres <= 0) this.solution = undefined;

    return extraction;
  }

  setSolution(newSolution: Solution) {
    this.solution = newSolution;
  }

  dropSolution(newSolution: Solution) {
    if (!this.solution) {
      this.solution = newSolution;
    } else {
      this.solution.mix(newSolution);
    }
  }

  empty() {
    this.solution = undefined;
  }

  disable() {
    super.disable();
    this.empty();
  }
}
