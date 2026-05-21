import { BATMAN_PROTECTION_WINDOW_SIZE } from "@/shared/constants/batman.ts";

export class BatmanSequenceWindow {
  private readonly bits = Array<boolean>(BATMAN_PROTECTION_WINDOW_SIZE).fill(false);

  private lastSequence: number | null = null;

  process(sequence: number) {
    if (this.lastSequence === null) {
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

  toArray(): boolean[] {
    return [...this.bits];
  }
}
