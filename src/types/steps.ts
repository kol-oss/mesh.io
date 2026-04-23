export type WorkflowStep = {
  id: string;
  title: string;
  type: "MOVE" | "MESSAGE" | "TOGGLE";
  tick: number;
};
