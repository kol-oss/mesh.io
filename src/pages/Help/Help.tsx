import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ui } from "../../i18n/messages";
import TextBlock from "../../components/Help/TextBlock";
import ModellingTrap from "../../components/Help/ModellingTrap";
import SourceBlock from "../../components/Help/SourceBlock";
import PacketStructure from "../../components/Help/PacketStructure";
import TableBlock from "../../components/Help/TableBlock";

const fakeText =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";

const SECTION_IDS = [
  "batman",
  "what-you-need-to-know",
  "echo-location-protocol",
  "throughput-calculation",
  "originator-message",
  "sequence-protection-window",
  "route-selection",
];

export default function Help() {
  useEffect(() => {
    const scrollToHashSection = () => {
      const sectionId = window.location.hash.replace("#", "");
      if (!sectionId) {
        return;
      }

      const section = document.getElementById(sectionId);
      if (!section) {
        return;
      }

      window.requestAnimationFrame(() => {
        section.scrollIntoView({ block: "start" });
      });
    };

    scrollToHashSection();
    window.addEventListener("hashchange", scrollToHashSection);

    return () => window.removeEventListener("hashchange", scrollToHashSection);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;

      for (let i = SECTION_IDS.length - 1; i >= 0; i--) {
        const sectionId = SECTION_IDS[i];
        const element = document.getElementById(sectionId);
        if (element && element.offsetTop <= scrollPosition) {
          window.history.replaceState(null, "", `/docs/batman#${sectionId}`);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
            <a href="/docs/batman" className="help-page__link help-page__link--active">
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
                **Better Approach To Mobile Ad-hoc Networking (B.A.T.M.A.N)** is a modern
                open-source routing protocol for multi-hop mobile ad hoc networks and since the
                release of kernel version 2.6.38 it is part of the official Linux kernel. This
                protocol intended to replace the **Optimized Link State Routing Protocol (OLSR)** as
                OLSR did not meet the performance requirements of large-scale mesh deployments.
              </TextBlock>
              <TextBlock>
                The approach of the B.A.T.M.A.N algorithm is to divide the knowledge about the best
                end-to-end paths between nodes in the mesh to all participating nodes. Each node
                perceives and maintains only the information about the best next hop towards all
                other nodes. Thereby the need for a global knowledge about local topology changes
                becomes unnecessary.
              </TextBlock>
              <SourceBlock>
                <TextBlock>
                  Open Mesh article "[B.A.T.M.A.N. Protocol
                  concept](https://www.open-mesh.org/projects/open-mesh/wiki/BATMANConcept)".
                </TextBlock>
              </SourceBlock>
            </div>

            {/* Throughput Calculation */}
            <div className="help-page__chapter" id="throughput-calculation">
              <h2 className="help-page__chapter-title">B.A.T.M.A.N. Versioning</h2>
              <TextBlock>
                The development of the B.A.T.M.A.N protocol started around 2006 and nowadays,
                includes 5 major versions/generations. One can think of generations I to V as the
                abstract ideas, the blueprints of the protocol, whereas **B.A.T.M.A.N Deamon
                (batmand)** and **B.A.T.M.A.N Advanced (batmanadv)** are the actual
                implementations/programms that turn the idea into reality.
              </TextBlock>
              <TextBlock>
                First three generations of the B.A.T.M.A.N protocol, as most of other mesh routing
                protocols, were designed to operate on the **Network Layer (OSI Layer 3)**, but in
                2007 the [B.A.T.M.A.N.
                Advanced](https://www.open-mesh.org/projects/batman-adv/wiki/Wiki) was released.
                This daemon version operates on the **Link Layer (OSI Layer 2)**, that enables more
                efficient routing for mesh networking compared to the IP-based approach of the
                original protocol.
              </TextBlock>
              <TextBlock>
                Simulator enables users to experiment with the **B.A.T.M.A.N. V** generation, which
                is the latest and most commonly used version of the protocol from B.A.T.M.A.N.
                Advanced group.
              </TextBlock>
              <ModellingTrap>
                <TextBlock>
                  The simulator originally designed to model network routing, but since the support
                  of last Network Layer version (**B.A.T.M.A.N. III**) is stopped at 2010-2011, we
                  decided to make an exception and implement a simplified version of Link Layer to
                  show main ideas behind this protocol.
                </TextBlock>
              </ModellingTrap>
            </div>

            {/* Echo Location Protocol (ELP) */}
            <div className="help-page__chapter" id="echo-location-protocol">
              <h2 className="help-page__chapter-title">Echo Location Protocol (ELP)</h2>
              <TextBlock>
                The **Echo Location Protocol (ELP)** was introduced as a foundational component of
                the B.A.T.M.A.N. V routing algorithm. To address the performance limitations of
                previous iterations, B.A.T.M.A.N. V decoupled the tasks of neighbor discovery and
                metric propagation, so ELP is specifically designed to handle the local neighbor
                discovery and link validation.
              </TextBlock>
              <TextBlock>
                B.A.T.M.A.N. V calculates the actual **throughput metric** through direct
                interaction with the operating system's link layer. For wireless interfaces, the
                protocol queries the WiFi driver's internal rate-control algorithm, such as the
                Linux `mac80211` subsystem, to retrieve the expected physical layer throughput based
                on current radio conditions. Similarly, for wired interfaces, it relies on system
                tools like `ethtool` to determine the theoretical bandwidth and duplex state of the
                Ethernet link.
              </TextBlock>
              <TextBlock>
                To achieve this, every node in the mesh network periodically broadcasts ELP packets
                (typically every **500 milliseconds**) out of all its configured B.A.T.M.A.N.
                interfaces that allows nodes to detect new neighbors entering direct radio range,
                rapidly track topology changes when a node leaves or powers down, and confirm that
                communication links remain vital and active.
              </TextBlock>
              <PacketStructure
                introText="Echo Location Protocol message"
                rows={[
                  [
                    {
                      label: "Packet Type",
                      bits: 8,
                      description: "Identifies this packet as an ELP message.",
                    },
                    {
                      label: "Version",
                      bits: 8,
                      description: "Protocol version used by the sender.",
                    },
                    {
                      label: "TTL",
                      bits: 8,
                      description:
                        "Remaining relay limit before the packet is discarded. Actually not used.",
                    },
                    {
                      label: "Num Neigh",
                      bits: 8,
                      description: "Number of neighbour entries included in this packet.",
                    },
                  ],
                  [
                    {
                      label: "Sequence Number",
                      bits: 32,
                      description:
                        "Monotonic packet number used to detect stale or repeated updates.",
                    },
                  ],
                  [
                    {
                      label: "Interval",
                      bits: 32,
                      description: "ELP transmit interval announced by the sender.",
                    },
                  ],
                  [
                    {
                      label: "Originator Address",
                      bits: 48,
                      description: "Address of the node that generated this ELP packet.",
                    },
                  ],
                  [
                    {
                      label: "Neighbour Address A",
                      bits: 48,
                      description: "First neighbour listed in the payload.",
                    },
                    {
                      label: "Neighbour Address B",
                      bits: 48,
                      description: "Second neighbour listed in the payload.",
                    },
                  ],
                ]}
              />
              <TextBlock>
                A distinguishing feature of ELP is the inclusion of a neighbor list within each
                packet. This list contains the MAC addresses of neighbors known to the sender. When
                a node receives an ELP message, it checks whether its own address appears in this
                list. If it does, the node can confirm that the link is bidirectional. This
                mechanism is particularly important in wireless environments, where links are often
                asymmetric. A node may be able to receive packets from a neighbor reliably while its
                own transmissions in the opposite direction are degraded.
              </TextBlock>
              <TextBlock>
                When a node receives an ELP packet, it first performs validation checks. The packet
                is silently discarded if there is a protocol version mismatch, invalid MAC
                addressing, or if the packet appears to originate from the receiving node itself due
                to a loopback. Only valid packets are processed further. Once accepted, the packet
                updates the local **Neighbor Table**. The node records the sequence number carried
                in the ELP message and refreshes the **Last seen** timestamp for the sender. Because
                ELP messages are sent at regular intervals, missing sequence numbers or delayed
                arrivals indicate packet loss, which directly contributes to link quality
                estimation.
              </TextBlock>
              <TableBlock
                introText="Neighbour Table entry"
                ariaLabel="Neighbour Table entry"
                headers={["Neighbour", "Throughput", "Last Seen", "Interval"]}
                rows={[
                  [
                    "Neighbour MAC address",
                    "Throughput value in Mbps",
                    "Timestamp of the last received packet",
                    "Interval between ELP packets",
                  ],
                ]}
              />
              <TextBlock>
                ELP packets are strictly local in scope and are *never forwarded* beyond one hop.
                Their sole purpose is to maintain an accurate and continuously updated view of
                direct neighbors and link performance. The resulting throughput metrics are then
                supplied to higher-level routing processes, such as **Originator Messages (OGMs)**,
                which use this information to compute optimal multi-hop paths through the network.
              </TextBlock>
              <SourceBlock>
                <TextBlock>
                  Open Mesh article "[Echo Location Protocol
                  (ELP)](https://www.open-mesh.org/projects/batman-adv/wiki/ELP)".
                </TextBlock>
              </SourceBlock>
            </div>

            {/* Throughput Calculation */}
            <div className="help-page__chapter" id="throughput-calculation">
              <h2 className="help-page__chapter-title">Throughput Calculation</h2>
              <TextBlock>
                The core function of ELP in B.A.T.M.A.N. V is the estimation of link throughput
                rather than simple packet delivery ratios. ELP frames are typically padded to sizes
                close to the network's maximum transmission unit (around 1500 bytes), ensuring that
                measurements reflect realistic transmission conditions on the physical medium. By
                observing how many of these packets are successfully received over time and
                comparing that to how many were expected based on the interval, the node derives a
                throughput estimate that represents the effective data rate of the link.
              </TextBlock>
              <TextBlock>
                Because wireless conditions can fluctuate rapidly, this raw throughput estimate is
                smoothed using an **Exponential Weighted Moving Average (EWMA)**. This prevents
                transient interference or short-term variations from causing unstable routing
                behavior.
              </TextBlock>
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
            <div className="help-page__chapter" id="originator-message">
              <h2 className="help-page__chapter-title">Originator Message version 2 (OGMv2)</h2>
              <TextBlock>
                {fakeText} **OGMv2** messages propagate routing information through the network.{" "}
                {fakeText}
              </TextBlock>
              <PacketStructure
                rows={[
                  [
                    {
                      label: "Version",
                      bits: 8,
                      description: "OGM protocol version field.",
                    },
                    {
                      label: "Flags",
                      bits: 8,
                      description: "Control flags for additional OGM semantics.",
                    },
                    {
                      label: "TTL",
                      bits: 8,
                      description: "Maximum forwarding depth still allowed.",
                    },
                    {
                      label: "Throughput",
                      bits: 8,
                      description: "Current path throughput estimate carried with the OGM.",
                    },
                  ],
                  [
                    {
                      label: "Sequence Number",
                      bits: 16,
                      description: "Sequence protection value to identify new OGMs.",
                    },
                    {
                      label: "GW Flags",
                      bits: 8,
                      description: "Gateway-related capability flags.",
                    },
                    {
                      label: "GW Port",
                      bits: 8,
                      description: "Gateway service port metadata.",
                    },
                  ],
                  [
                    {
                      label: "Originator Address",
                      bits: 32,
                      description: "Source node that originated the route advertisement.",
                    },
                  ],
                  [
                    {
                      label: "Sender Address",
                      bits: 32,
                      description: "Last-hop node that forwarded this OGM.",
                    },
                  ],
                ]}
              />
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
            <div className="help-page__chapter" id="sequence-protection-window">
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
            <div className="help-page__chapter" id="route-selection">
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
