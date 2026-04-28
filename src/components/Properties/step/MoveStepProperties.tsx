import { Radio } from "lucide-react";

import type { PeerEntity } from "../../../types/entities";
import type { MoveStep } from "../../../types/steps";
import { parseNumberValue } from "../../../utils/properties";
import Select from "../../Select/Select";

type MoveStepPropertiesProps = {
  selectedStep: MoveStep;
  peers: PeerEntity[];
  moveTargetValue: string;
  isStepMoveEntityMissing: boolean;
  updateStep: (changes: Partial<MoveStep>) => void;
};

export default function MoveStepProperties({
  selectedStep,
  peers,
  moveTargetValue,
  isStepMoveEntityMissing,
  updateStep,
}: MoveStepPropertiesProps) {
  const peerSelectOptions = peers.map((peer) => ({
    value: peer.id,
    label: peer.name,
    icon: <Radio size={12} />,
  }));

  return (
    <>
      <label className="properties__field">
        <span
          className={`properties__field-label ${isStepMoveEntityMissing ? "properties__field-label--required" : ""}`}
        >
          Peer
        </span>
        <Select
          value={moveTargetValue}
          invalid={isStepMoveEntityMissing}
          options={peerSelectOptions}
          onChange={(value) => {
            const nextMovePeerId = value || "";
            const selectedPeer = peers.find((peer) => peer.id === nextMovePeerId);
            const hasMoveCoordinates = selectedStep.x !== 0 || selectedStep.y !== 0;

            if (!selectedPeer || hasMoveCoordinates) {
              updateStep({ movePeerId: nextMovePeerId });
              return;
            }

            updateStep({
              movePeerId: nextMovePeerId,
              x: selectedPeer.x,
              y: selectedPeer.y,
            });
          }}
        />
      </label>

      <label className="properties__field">
        <span className="properties__field-label">Position</span>
        <div className="properties__inline-group">
          <div className="properties__input-with-icon">
            <span className="properties__input-icon">X</span>
            <input
              className="properties__input"
              type="number"
              value={selectedStep.x}
              onChange={(event) =>
                updateStep({
                  x: parseNumberValue(event.target.value, selectedStep.x),
                })
              }
            />
          </div>
          <div className="properties__input-with-icon">
            <span className="properties__input-icon">Y</span>
            <input
              className="properties__input"
              type="number"
              value={selectedStep.y}
              onChange={(event) =>
                updateStep({
                  y: parseNumberValue(event.target.value, selectedStep.y),
                })
              }
            />
          </div>
        </div>
      </label>
    </>
  );
}
