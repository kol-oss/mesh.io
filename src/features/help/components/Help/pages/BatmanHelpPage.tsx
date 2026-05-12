import { useEffect } from "react";

import FormulaBlock from "../FormulaBlock";
import ModellingTrap from "../ModellingTrap";
import PacketStructure from "../PacketStructure";
import SourceBlock from "../SourceBlock";
import TableBlock from "../TableBlock";
import TextBlock from "../TextBlock";

const SECTION_IDS = [
  "batman",
  "what-you-need-to-know",
  "batman-versioning",
  "echo-location-protocol",
  "throughput-calculation",
  "originator-message",
  "sequence-protection-window",
  "route-selection",
];

export default function BatmanHelpPage() {
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
      const scrollPosition = window.scrollY;

      for (let i = SECTION_IDS.length - 1; i >= 0; i -= 1) {
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
    <section className="help-page__section" id="batman">
      <div className="help-page__big-header">
        <h1 className="help-page__big-title">B.A.T.M.A.N. V</h1>
        <p className="help-page__big-subtitle">Better Approach To Mobile Ad-hoc Networking</p>
      </div>

      <div className="help-page__chapter" id="what-you-need-to-know">
        <h2 className="help-page__chapter-title">What You Need to Know</h2>
        <TextBlock>
          **Better Approach To Mobile Ad-hoc Networking (B.A.T.M.A.N)** is a modern open-source
          routing protocol for multi-hop mobile ad hoc networks and since the release of kernel
          version 2.6.38 it is part of the official Linux kernel. This protocol intended to replace
          the **Optimized Link State Routing Protocol (OLSR)** as OLSR did not meet the performance
          requirements of large-scale mesh deployments.
        </TextBlock>
        <TextBlock>
          The approach of the B.A.T.M.A.N algorithm is to divide the knowledge about the best
          end-to-end paths between nodes in the mesh to all participating nodes. Each node perceives
          and maintains only the information about the best next hop towards all other nodes.
          Thereby the need for a global knowledge about local topology changes becomes unnecessary.
        </TextBlock>
        <SourceBlock>
          <TextBlock>
            Open Mesh article "[B.A.T.M.A.N. Protocol
            concept](https://www.open-mesh.org/projects/open-mesh/wiki/BATMANConcept)".
          </TextBlock>
        </SourceBlock>
      </div>

      <div className="help-page__chapter" id="batman-versioning">
        <h2 className="help-page__chapter-title">B.A.T.M.A.N. Versioning</h2>
        <TextBlock>
          The development of the B.A.T.M.A.N protocol started around 2006 and nowadays, includes 5
          major versions/generations. One can think of generations I to V as the abstract ideas, the
          blueprints of the protocol, whereas **B.A.T.M.A.N Deamon (batmand)** and **B.A.T.M.A.N
          Advanced (batmanadv)** are the actual implementations/programms that turn the idea into
          reality.
        </TextBlock>
        <TextBlock>
          First three generations of the B.A.T.M.A.N protocol, as most of other mesh routing
          protocols, were designed to operate on the **Network Layer (OSI Layer 3)**, but in 2007
          the [B.A.T.M.A.N. Advanced](https://www.open-mesh.org/projects/batman-adv/wiki/Wiki) was
          released. This daemon version operates on the **Link Layer (OSI Layer 2)**, that enables
          more efficient routing for mesh networking compared to the IP-based approach of the
          original protocol.
        </TextBlock>
        <TextBlock>
          Simulator enables users to experiment with the **B.A.T.M.A.N. V** generation, which is the
          latest and most commonly used version of the protocol from B.A.T.M.A.N. Advanced group.
        </TextBlock>
        <ModellingTrap>
          <TextBlock>
            The simulator originally designed to model network routing, but since the support of
            last Network Layer version (**B.A.T.M.A.N. III**) is stopped at 2010-2011, we decided to
            make an exception and implement a simplified version of Link Layer to show main ideas
            behind this protocol.
          </TextBlock>
        </ModellingTrap>
      </div>

      <div className="help-page__chapter" id="echo-location-protocol">
        <h2 className="help-page__chapter-title">Echo Location Protocol (ELP)</h2>
        <TextBlock>
          The **Echo Location Protocol (ELP)** was introduced as a foundational component of the
          B.A.T.M.A.N. V routing algorithm. To address the performance limitations of previous
          iterations, B.A.T.M.A.N. V decoupled the tasks of neighbor discovery and metric
          propagation, so ELP is specifically designed to handle the local neighbor discovery and
          link validation.
        </TextBlock>
        <TextBlock>
          B.A.T.M.A.N. V calculates the actual **throughput metric** through direct interaction with
          the operating system's link layer. For wireless interfaces, the protocol queries the WiFi
          driver's internal rate-control algorithm, such as the Linux `mac80211` subsystem, to
          retrieve the expected physical layer throughput based on current radio conditions.
          Similarly, for wired interfaces, it relies on system tools like `ethtool` to determine the
          theoretical bandwidth and duplex state of the Ethernet link.
        </TextBlock>
        <ModellingTrap>
          <TextBlock>
            As throughput values are part of the Link Layer, inside the simulation they were made
            static and could be modified only by degradation via _penalty mechanism_ inside
            configuration. By default wired link throughput is **1000 Mbps**, when for dynamic
            wireless link this value is **100 Mbps**.
          </TextBlock>
        </ModellingTrap>
        <TextBlock>
          To achieve this, every node in the mesh network periodically broadcasts ELP packets
          (typically every **500 milliseconds**) out of all its configured B.A.T.M.A.N. interfaces
          that allows nodes to detect new neighbors entering direct radio range, rapidly track
          topology changes when a node leaves or powers down, and confirm that communication links
          remain vital and active.
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
                description: "Monotonic packet number used to detect stale or repeated updates.",
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
                description: "MAC address of the node that generated this ELP packet.",
              },
            ],
            [
              {
                label: "Neighbour Address A",
                bits: 48,
                description: "MAC address of the first neighbour listed in the payload.",
              },
              {
                label: "Neighbour Address B",
                bits: 48,
                description: "MAC address of the second neighbour listed in the payload.",
              },
            ],
          ]}
        />
        <TextBlock>
          A distinguishing feature of ELP is the inclusion of a neighbor list within each packet.
          This list contains the MAC addresses of neighbors known to the sender. When a node
          receives an ELP message, it checks whether its own address appears in this list. If it
          does, the node can confirm that the link is bidirectional. This mechanism is particularly
          important in wireless environments, where links are often asymmetric. A node may be able
          to receive packets from a neighbor reliably while its own transmissions in the opposite
          direction are degraded.
        </TextBlock>
        <TextBlock>
          When a node receives an ELP packet, it first performs validation checks. The packet is
          silently discarded if there is a protocol version mismatch, invalid MAC addressing, or if
          the packet appears to originate from the receiving node itself due to a loopback. Only
          valid packets are processed further. Once accepted, the packet updates the local
          **Neighbor Table**. The node records the sequence number carried in the ELP message and
          refreshes the **Last seen** timestamp for the sender. Because ELP messages are sent at
          regular intervals, missing sequence numbers or delayed arrivals indicate packet loss,
          which directly contributes to link quality estimation.
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
          ELP packets are strictly local in scope and are *never forwarded* beyond one hop. Their
          sole purpose is to maintain an accurate and continuously updated view of direct neighbors
          and link performance. The resulting throughput metrics are then supplied to higher-level
          routing processes, such as **Originator Messages (OGMs)**, which use this information to
          compute optimal multi-hop paths through the network.
        </TextBlock>
        <SourceBlock>
          <TextBlock>
            Open Mesh article "[Echo Location Protocol
            (ELP)](https://www.open-mesh.org/projects/batman-adv/wiki/ELP)".
          </TextBlock>
        </SourceBlock>
      </div>

      <div className="help-page__chapter" id="throughput-calculation">
        <h2 className="help-page__chapter-title">Throughput Calculation</h2>
        <TextBlock>
          The core function of ELP in B.A.T.M.A.N. V is the estimation of link throughput rather
          than simple packet delivery ratios. ELP frames are typically padded to sizes close to the
          network's maximum transmission unit (around 1500 bytes), ensuring that measurements
          reflect realistic transmission conditions on the physical medium. By observing how many of
          these packets are successfully received over time and comparing that to how many were
          expected based on the interval, the node derives a throughput estimate that represents the
          effective data rate of the link.
        </TextBlock>
        <FormulaBlock formula="throughput ≈ (received_packets / expected_packets) × packet_size / interval" />
        <TextBlock>
          Because wireless conditions can fluctuate rapidly, this raw throughput estimate is
          smoothed using an **Exponential Weighted Moving Average (EWMA)**. This prevents transient
          interference or short-term variations from causing unstable routing behavior. In
          B.A.T.M.A.N. V, the smoothing factor α has a default value of 0.2, meaning that each new
          measurement contributes 20% to the updated metric while 80% is retained from the previous
          value. This balances responsiveness with stability, preventing transient interference or
          short-term variations from causing unstable routing behavior.
        </TextBlock>
        <FormulaBlock formula="metric_new = (1 − α) × metric_old + α × metric_sample" />
        <ModellingTrap>
          <TextBlock>
            The link quality for B.A.T.M.A.N. V is determined via **distance penalty mechanism**,
            that degradates link quality by specified percentage for every distance that link
            exceeds. Pay attention that this mechanism *is not applied* to the wired links.
          </TextBlock>
        </ModellingTrap>
      </div>

      <div className="help-page__chapter" id="originator-message">
        <h2 className="help-page__chapter-title">Originator Message version 2 (OGMv2)</h2>
        <TextBlock>
          **Originator Messages version 2 (OGMv2)** in B.A.T.M.A.N. V are the core mechanism for
          multi-hop route discovery and network-wide topology propagation. While ELP operates
          strictly on a one-hop level, OGMv2 messages distribute reachability information across the
          entire mesh, allowing each node to determine the best next hop toward every known
          originator. Each node periodically (typically **every second**) emits OGMv2 packets,
          identifying itself as the originator. These messages are broadcast and forwarded by other
          nodes, propagating hop-by-hop through the network.
        </TextBlock>
        <PacketStructure
          rows={[
            [
              {
                label: "Packet Type ",
                bits: 8,
                description: "Identifies this packet as an OGM message.",
              },
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
            ],
            [
              {
                label: "Sequence Number",
                bits: 32,
                description: "Sequence protection value to identify new OGMs.",
              },
            ],
            [
              {
                label: "Originator Address",
                bits: 48,
                description:
                  "MAC address of the source node that originated the route advertisement.",
              },
            ],
            [
              {
                label: "Throughput",
                bits: 32,
                description: "Current path throughput estimate carried with the OGM.",
              },
            ],
            [
              {
                label: "Sender Address",
                bits: 48,
                description: "MAC address of the last-hop node that forwarded this OGM.",
              },
            ],
          ]}
        />
        <TextBlock>
          When a node receives an OGMv2 packet, it first validates the message. Packets are
          discarded if they fail checks such as protocol version mismatch, malformed headers, or if
          they originate from the receiving node itself. Duplicate detection is also performed
          *using the originator address and sequence number* to prevent reprocessing of already seen
          messages.
        </TextBlock>
        <TextBlock>
          Once validated, the node updates its **Originator Table**. Each OGMv2 carries a
          monotonically increasing **Sequence Number** generated by the originator. This sequence
          number allows nodes to determine the freshness of routing information and to detect packet
          loss across multiple hops. Only newer or otherwise relevant sequence numbers are
          considered for updating routing state.
        </TextBlock>
        <TextBlock>
          Each node maintains, for every originator, a set of candidate next hops along with their
          associated path metrics. When multiple OGMs for the same originator are received via
          different neighbors, the node compares the resulting metrics and selects the neighbor
          offering the highest effective throughput as the preferred next hop. This selection
          process is continuous, allowing the routing table to adapt dynamically to changing network
          conditions.
        </TextBlock>
        <TableBlock
          introText="Originator Table entry"
          ariaLabel="Originator Table entry"
          headers={["Originator", "Next Hop", "Throughput", "Last Seen"]}
          rows={[
            [
              "Originator MAC address",
              "Next hop MAC address",
              "Throughput value in Mbps",
              "Timestamp of the last received packet",
            ],
          ]}
        />
        <TextBlock>
          As the OGMv2 propagates through the network, each forwarding node updates the path metric
          to reflect the cost of reaching the originator through that path. In B.A.T.M.A.N. V, this
          metric is based on throughput rather than hop count. The forwarding node combines the
          incoming metric with the throughput of the local link (as measured by ELP) to produce a
          new, reduced metric that represents the cumulative path quality.
        </TextBlock>
        <FormulaBlock formula="metric_path = min(metric_in, metric_link)" />
        <TextBlock>
          This approach ensures that the overall path metric is dominated by the weakest link along
          the route, effectively modeling the bottleneck throughput of the path. As a result, routes
          with fewer but poorer-quality links are naturally deprioritized in favor of more reliable,
          higher-throughput paths. To further refine routing decisions, B.A.T.M.A.N. V may apply
          additional penalties or adjustments during forwarding, such as interface-specific
          considerations or hop-related dampening, though the primary factor remains the
          throughput-based metric derived from ELP.
        </TextBlock>
        <ModellingTrap>
          <TextBlock>
            The effective throughput degrades with each hop. To account for this, B.A.T.M.A.N. V
            applies an additional **penalty of 5.8% per wireless hop** whenever an OGMv2 packet is
            retransmitted, that was also implemented inside the simulator.
          </TextBlock>
        </ModellingTrap>
        <TextBlock>
          OGMv2 forwarding is subject to loop avoidance and efficiency rules. Nodes only rebroadcast
          OGMs if they provide new or improved information, reducing unnecessary transmissions.
          Additionally, mechanisms such as **Sequence Number Windows** ensure that the protocol
          scales without excessive overhead.
        </TextBlock>
        <SourceBlock>
          <TextBlock>
            Open Mesh article "[Originator Message version 2
            (OGMv2)](https://www.open-mesh.org/projects/batman-adv/wiki/Ogmv2)".
          </TextBlock>
        </SourceBlock>
      </div>

      <div className="help-page__chapter" id="sequence-protection-window">
        <h2 className="help-page__chapter-title">Sequence Protection Window</h2>
        <TextBlock>
          The **Sequence Protection Window** in B.A.T.M.A.N. V is a sliding bitmap used to track
          recently seen OGMv2 sequence numbers and prevent processing of duplicates, replayed
          packets, or outdated routing information. Since OGMs are flooded across the mesh and can
          arrive multiple times via different paths, this mechanism ensures that each sequence
          number from an originator is handled only once.
        </TextBlock>
        <TextBlock>
          Each originator has its own window, which represents a bounded range of recent sequence
          numbers. When an OGMv2 arrives, the node checks whether its sequence number is within this
          range. If it is and the corresponding bit is already set, the packet is *treated as a
          duplicate and dropped*. If the bit is not set, the packet is accepted and recorded in the
          window.
        </TextBlock>
        <TextBlock>
          If a sequence number is newer than the current range, the window is shifted forward to
          include it, discarding older entries. If it is too old and falls outside the window, it is
          immediately rejected to avoid replay effects. In practice, this creates a compact history
          of recently processed OGMs, allowing the protocol to efficiently suppress redundancy while
          maintaining correct and up-to-date routing state across the network.
        </TextBlock>
        <ModellingTrap>
          <TextBlock>
            The size for **Sequence Protection Window** in B.A.T.M.A.N. V is configurable and
            typically set to **64 bits**, that was actually implemented in the simulator.
          </TextBlock>
        </ModellingTrap>
      </div>

      <div className="help-page__chapter" id="route-selection">
        <h2 className="help-page__chapter-title">Route Selection</h2>
        <TextBlock>
          Route selection in B.A.T.M.A.N. V is performed using the best-received OGMv2 metrics for
          each originator. After duplicate filtering via the **Sequence Protection Window**, each
          valid OGM contributes a path metric derived from ELP-based throughput measurements and
          hop-based degradation. The node maintains a set of candidate next hops per originator and
          continuously compares their cumulative metrics.
        </TextBlock>
        <TextBlock>
          The preferred route is always the one with the **highest effective throughput**, meaning
          the path that preserves the largest remaining metric after all hop penalties and link
          degradations are applied. This ensures that routing decisions are not based on hop count,
          but on end-to-end link quality as observed through OGM propagation and ELP measurements.
        </TextBlock>
      </div>
    </section>
  );
}
