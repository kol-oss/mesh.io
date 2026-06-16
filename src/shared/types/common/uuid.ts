import { v4 as uuidv4 } from "uuid";

export type UUID = string;

export function generateUUID(): UUID {
  return uuidv4();
}
