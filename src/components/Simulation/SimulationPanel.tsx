import type { SimulationStepResult } from "../../types/simulation";

type SimulationPanelProps = {
  currentStepResult: SimulationStepResult | null;
  currentStepIndex: number;
  totalSteps: number;
  showRoutingTables: boolean;
};

export default function SimulationPanel({
  currentStepResult,
  currentStepIndex,
  totalSteps,
  showRoutingTables,
}: SimulationPanelProps) {
  if (!currentStepResult) {
    return null;
  }

  return (
    <aside className="simulation-panel" aria-label="Simulation results">
      <header className="simulation-panel__header">
        <div>
          <h2 className="simulation-panel__title">Simulation</h2>
          <p className="simulation-panel__subtitle">
            Step {currentStepIndex + 1} of {totalSteps}: {currentStepResult.step.title}
          </p>
        </div>
        <span className="simulation-panel__tick">Tick {currentStepResult.snapshot.tick}</span>
      </header>

      <section className="simulation-panel__section">
        <h3 className="simulation-panel__section-title">Events</h3>
        {currentStepResult.events.length === 0 ? (
          <p className="simulation-panel__empty">No events were emitted for this step.</p>
        ) : (
          <div className="simulation-panel__events">
            {currentStepResult.events.map((event) => (
              <article className="simulation-panel__event" key={event.id}>
                <div className="simulation-panel__event-meta">
                  <span>{event.peerId}</span>
                  <strong>{event.type}</strong>
                </div>
                <pre className="simulation-panel__details">
                  {JSON.stringify(event.details, null, 2)}
                </pre>
              </article>
            ))}
          </div>
        )}
      </section>

      {showRoutingTables ? (
        <section className="simulation-panel__section">
          <h3 className="simulation-panel__section-title">Routing Tables</h3>
          <div className="simulation-panel__tables">
            {currentStepResult.snapshot.peers.map((peer) => (
              <article className="simulation-panel__table" key={peer.id}>
                <h4 className="simulation-panel__peer-name">{peer.name}</h4>
                {peer.routingTable.length === 0 ? (
                  <p className="simulation-panel__empty">No BATMAN routes.</p>
                ) : (
                  <pre className="simulation-panel__details">
                    {JSON.stringify(peer.routingTable, null, 2)}
                  </pre>
                )}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </aside>
  );
}
