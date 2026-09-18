import { BATMAN_PROTECTION_WINDOW_SIZE } from "@/shared/constants/protocols/batman";

export class SequenceWindow {
  private readonly bits = Array<boolean>(BATMAN_PROTECTION_WINDOW_SIZE).fill(false);
  private lastSequence: number = Number.NEGATIVE_INFINITY;

  // handles the sequence number and returns true if the sequence is processed
  process(sequence: number): boolean {
    if (this.lastSequence === Number.NEGATIVE_INFINITY) {
      this.lastSequence = sequence;
      this.bits[0] = true;
      return true;
    }

    const diff = sequence - this.lastSequence;
    if (diff <= 0 && Math.abs(diff) < BATMAN_PROTECTION_WINDOW_SIZE) {
      const index = Math.abs(diff);
      if (this.bits[index]) {
        return false;
      }

      this.bits[index] = true;
      return true;
    }

    if (diff > 0) {
      if (diff >= BATMAN_PROTECTION_WINDOW_SIZE) {
        this.bits.fill(false);
      } else {
        for (let index = BATMAN_PROTECTION_WINDOW_SIZE - 1; index >= diff; index -= 1) {
          this.bits[index] = this.bits[index - diff];
        }

        for (let index = 0; index < diff; index += 1) {
          this.bits[index] = false;
        }
      }

      this.bits[0] = true;
      this.lastSequence = sequence;
    }

    return true;
  }

  getBits(): boolean[] {
    return [...this.bits];
  }
}
