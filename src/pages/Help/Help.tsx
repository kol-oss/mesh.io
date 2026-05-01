import { Link } from "react-router-dom";
import { ui } from "../../i18n/messages";
import TextBlock from "../../components/Help/TextBlock";
import ModellingTrap from "../../components/Help/ModellingTrap";
import SourceBlock from "../../components/Help/SourceBlock";

const fakeText =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";

export default function Help() {
  return (
    <div className="help-page">
      <header className="help-page__header">
        <div className="help-page__header-inner">
          <div className="help-page__brand">
            <img
              className="help-page__brand-logo"
              src="/favicon.svg"
              alt={ui.navigation.appLogoAlt}
            />
            <div>
              <p className="help-page__brand-title">{ui.navigation.appName}</p>
              <p className="help-page__brand-subtitle">{ui.navigation.appMotto}</p>
            </div>
          </div>

          <nav className="help-page__links" aria-label={ui.navigation.menuHelp}>
            <a href="#batman" className="help-page__link help-page__link--active">
              B.A.T.M.A.N.
            </a>
          </nav>

          <Link className="help-page__simulation-button" to="/" target="_blank" rel="noreferrer">
            {ui.help.simulationButton}
          </Link>
        </div>
      </header>

      <div className="help-page__body">
        <main className="help-page__content">
          <section className="help-page__section" id="batman">
            {/* Big Header */}
            <div className="help-page__big-header">
              <h1 className="help-page__big-title">B.A.T.M.A.N. V</h1>
              <p className="help-page__big-subtitle">Better Approach To Mobile Ad-hoc Networking</p>
            </div>

            {/* What You Need to Know */}
            <div className="help-page__chapter" id="what-you-need-to-know">
              <h2 className="help-page__chapter-title">What You Need to Know</h2>
              <TextBlock>
                {fakeText} {fakeText}
              </TextBlock>
              <TextBlock>
                Understanding **B.A.T.M.A.N.** helps you grasp routing in **dynamic mesh networks**.
                This protocol prioritizes **throughput** over hop count, making it ideal for
                wireless networks.
              </TextBlock>
            </div>

            {/* Echo Location Protocol (ELP) */}
            <div className="help-page__chapter" id="what-you-need-to-know">
              <h2 className="help-page__chapter-title">Echo Location Protocol (ELP)</h2>
              <TextBlock>
                {fakeText} The **Echo Location Protocol** measures link quality by sending periodic
                packets. {fakeText}
              </TextBlock>
              <ModellingTrap>
                <TextBlock>
                  Do not confuse ELP measurement intervals with **refreshing display snapshots**.
                  ELP operates at simulation tick-level, independent of UI rendering.
                </TextBlock>
              </ModellingTrap>
              <SourceBlock>
                <TextBlock>
                  For detailed information about ELP, refer to the **B.A.T.M.A.N. V specification**.{" "}
                  {fakeText}
                </TextBlock>
              </SourceBlock>
            </div>

            {/* Throughput Calculation */}
            <div className="help-page__chapter" id="what-you-need-to-know">
              <h2 className="help-page__chapter-title">Throughput Calculation</h2>
              <TextBlock>
                {fakeText} **Throughput** is calculated based on link quality metrics. {fakeText}
              </TextBlock>
              <TextBlock>
                The formula uses **packet loss** and **retransmission rates** to estimate actual
                bandwidth.
              </TextBlock>
              <ModellingTrap>
                <TextBlock>
                  High throughput values do not guarantee packet delivery. Use **OGM metrics** to
                  understand path quality.
                </TextBlock>
              </ModellingTrap>
            </div>

            {/* Originator Message version 2 (OGMv2) */}
            <div className="help-page__chapter" id="what-you-need-to-know">
              <h2 className="help-page__chapter-title">Originator Message version 2 (OGMv2)</h2>
              <TextBlock>
                {fakeText} **OGMv2** messages propagate routing information through the network.{" "}
                {fakeText}
              </TextBlock>
              <TextBlock>
                Each OGM contains the **originator's address** and **throughput metrics** to
                destination nodes.
              </TextBlock>
              <SourceBlock>
                <TextBlock>
                  OGMv2 replaces the older OGMv1 with improved **metric accuracy** and **hop
                  validation**.
                </TextBlock>
              </SourceBlock>
            </div>

            {/* Sequence Protection Window */}
            <div className="help-page__chapter" id="what-you-need-to-know">
              <h2 className="help-page__chapter-title">Sequence Protection Window</h2>
              <TextBlock>
                {fakeText} The **sequence protection window** prevents duplicate OGM processing.{" "}
                {fakeText}
              </TextBlock>
              <TextBlock>
                B.A.T.M.A.N. maintains a **window of accepted sequence numbers** to reject
                **outdated or replayed** messages.
              </TextBlock>
              <ModellingTrap>
                <TextBlock>
                  Sequence window violations indicate **looping packets** or **network
                  instability**. Check your topology for loops.
                </TextBlock>
              </ModellingTrap>
            </div>

            {/* Route Selection */}
            <div className="help-page__chapter" id="what-you-need-to-know">
              <h2 className="help-page__chapter-title">Route Selection</h2>
              <TextBlock>
                {fakeText} **Route selection** favors paths with the **highest throughput** metrics.{" "}
                {fakeText}
              </TextBlock>
              <TextBlock>
                Unlike hop-count routing, B.A.T.M.A.N. **avoids poor-quality links** even if they
                are **shorter**.
              </TextBlock>
              <SourceBlock>
                <TextBlock>
                  The routing table is recalculated every time a new **OGM** is received from a
                  neighbor.
                </TextBlock>
              </SourceBlock>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
