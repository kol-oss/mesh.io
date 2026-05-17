import { type RoutingProtocol } from "../types/common/protocols";
import type { UUID } from "../types/common/uuid";
import type { PeerConfiguration } from "../types/model/configurations";
import type { PeerEntity } from "../types/model/entities";

export const parseNumberValue = (value: string, fallback: number) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

export const parsePositiveNumberValue = (value: string, fallback: number, minimum = 1) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue >= minimum ? parsedValue : fallback;
};

export const parseNumber = (value: string, fallback: number) => {
  return isNaN(Number(value)) ? fallback : Number(value);
};

export const getChangeFunction = (
  peer: PeerEntity,
  updatePeerById: (id: UUID, changes: Partial<PeerConfiguration>) => void,
  updatePeersByProtocol: (protocol: RoutingProtocol, changes: Partial<PeerConfiguration>) => void,
) => {
  return (
    event: React.ChangeEvent<HTMLInputElement>,
    field: string,
    min: number = 0,
    global: boolean = false,
  ) => {
    const { value } = event.target;
    const parsedValue = parseNumber(value, min);

    return global
      ? updatePeersByProtocol(peer.protocol, {
          [field]: parsedValue,
        })
      : updatePeerById(peer.id, {
          [field]: parsedValue,
        });
  };
};
