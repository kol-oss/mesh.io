export type WorkflowStep = {
  id: string;
  title: string;
  type: "MOVE" | "MESSAGE" | "TOGGLE";
  tick: number;
  sourcePeerId: string | null;
  destinationPeerId: string | null;
  targetEntityId: string | null;
  movePeerId: string | null;
  x: number;
  y: number;
};
