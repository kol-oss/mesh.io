import ModellingTrap from "@/features/help/components/Block/ModellingTrap";
import PacketBlock from "@/features/help/components/Block/PacketBlock";
import SourceBlock from "@/features/help/components/Block/SourceBlock";
import TableBlock from "@/features/help/components/Block/TableBlock";
import TextBlock from "@/features/help/components/Block/TextBlock";
import { useScroll } from "../../hooks/useScroll";

const SECTIONS = [
  "olsr",
  "what-you-need-to-know",
  "neighbor-sensing",
  "multipoint-relays",
  "topology-discovery",
  "route-selection",
];

export default function OlsrHelp() {
  useScroll("olsr", SECTIONS);

  return (
    <section className="help-page__section" id="olsr">
      <div className="help-page__big-header">
        <h1 className="help-page__big-title">OLSR</h1>
        <p className="help-page__big-subtitle">Optimized Link State Routing Protocol</p>
      </div>

      <div className="help-page__chapter" id="what-you-need-to-know">
        <h2 className="help-page__chapter-title">What You Need to Know</h2>
        <TextBlock>
          The **Optimized Link State Routing Protocol (OLSR)** is an IP routing protocol optimized
          for mobile ad hoc networks (MANETs). It is a proactive, table-driven routing protocol,
          meaning that it continuously maintains routing information to all reachable destinations
          in the network. Routes are immediately available when needed, eliminating the route
          discovery delay found in reactive protocols like AODV.
        </TextBlock>
        <TextBlock>
          Operating on the **Network Layer (OSI Layer 3)**, OLSR works as a classic link-state
          protocol but introduces a critical optimization: **Multipoint Relays (MPRs)**. Instead of
          allowing every node to flood the network with routing updates (which causes massive
          overhead in wireless environments), OLSR selects specific nodes as MPRs to act as
          specialized routers. Only these selected nodes are responsible for forwarding control
          traffic, drastically reducing redundant transmissions.
        </TextBlock>
        <SourceBlock>
          <TextBlock>
            IETF RFC 3626 "[Optimized Link State Routing Protocol
            (OLSR)](https://datatracker.ietf.org/doc/html/rfc3626)".
          </TextBlock>
        </SourceBlock>
      </div>

      <div className="help-page__chapter" id="neighbor-sensing">
        <h2 className="help-page__chapter-title">Neighbor Sensing (HELLO Messages)</h2>
        <TextBlock>
          To maintain network topology, each node must first discover its local neighborhood. This
          is achieved through the periodic broadcast of **HELLO messages**. By default, these
          messages are transmitted every **2 seconds**. They are strictly local in scope, having a
          Time-To-Live (TTL) of 1, meaning they are never forwarded by receiving nodes.
        </TextBlock>
        <TextBlock>
          HELLO messages serve three critical functions: link sensing, neighbor detection, and MPR
          selection signaling. Through these broadcasts, nodes detect whether a link to a neighbor
          is asymmetric (can only hear the neighbor) or symmetric (bidirectional communication is
          confirmed). Additionally, nodes use HELLO messages to announce the neighbors they have
          selected to act as their Multipoint Relays.
        </TextBlock>
        <PacketBlock
          introText="HELLO Message Structure"
          rows={[
            [
              {
                label: "Interval",
                bits: 16,
                description: "Emission interval of the HELLO message.",
              },
            ],
            [
              {
                label: "Neighbour Address [1...n]",
                bits: 32,
                description: "IP addresses of all direct neighbours known to the sender.",
              },
            ],
            [
              {
                label: "MPR Address [1...n]",
                bits: 32,
                description: "IP addresses of neighbours selected as MPRs by this node.",
              },
            ],
          ]}
        />
        <TextBlock>
          When a node receives a HELLO message, it updates its internal **Neighbour Set** and
          **Two-Hop Neighbour Set**. If node A receives a HELLO from node B, and node B's message
          lists node A in its MPR list, node A updates its neighbour status accordingly. The node
          also records which of its neighbours have been selected as MPRs, populating the **MPR
          Selector Set**.
        </TextBlock>
        <TableBlock
          introText="Neighbour Set Entry"
          ariaLabel="Neighbour Set Entry"
          headers={["Address", "Status", "Last Seen"]}
          rows={[
            [
              "Main IP address of the neighbour",
              "Symmetric or MPR",
              "Tick when this entry was last refreshed",
            ],
          ]}
        />
        <TableBlock
          introText="Two-Hop Neighbour Set Entry"
          ariaLabel="Two-Hop Neighbour Set Entry"
          headers={["Address", "Two-Hop Address", "Last Update"]}
          rows={[
            [
              "IP address of the 1-hop neighbour acting as relay",
              "IP address of the reachable 2-hop neighbour",
              "Tick when this entry was last refreshed",
            ],
          ]}
        />
      </div>

      <div className="help-page__chapter" id="multipoint-relays">
        <h2 className="help-page__chapter-title">Multipoint Relays (MPR)</h2>
        <TextBlock>
          The most significant departure of OLSR from traditional link-state protocols is the
          concept of **Multipoint Relays (MPRs)**. In a dense mobile ad hoc network, pure flooding
          of link-state information creates a broadcast storm, leading to severe packet collisions
          and network congestion. To solve this, each node selects a subset of its symmetric 1-hop
          neighbors to serve as its MPRs.
        </TextBlock>
        <TextBlock>
          The fundamental rule of MPR selection is absolute coverage: **a node must choose an MPR
          set such that it can reach all of its strict 2-hop neighbors through at least one MPR**.
        </TextBlock>
        <TextBlock>
          The selection process relies on the **2-Hop Neighbour Set** populated via HELLO messages.
          OLSR employs a greedy algorithm: it first selects 1-hop neighbours that provide the *only*
          path to certain 2-hop neighbours. Then, it iteratively selects the 1-hop neighbour that
          covers the highest number of remaining, uncovered 2-hop neighbours until full coverage is
          achieved.
        </TextBlock>
        <ModellingTrap>
          <TextBlock>
            RFC 3626 defines a **Willingness** field in HELLO messages that lets nodes declare their
            desire to forward traffic (`WILL_NEVER` to `WILL_ALWAYS`). Willingness-based MPR
            filtering is *not modeled* in the simulator; the greedy coverage algorithm runs on all
            reachable symmetric neighbours without willingness weighting.
          </TextBlock>
        </ModellingTrap>
        <TextBlock>
          Once selected, an MPR has two unique responsibilities: it is the only node allowed to
          forward broadcast control messages received from its selectors, and it is the only node
          that generates Topology Control (TC) messages to advertise the network's link states.
        </TextBlock>
        <TableBlock
          introText="MPR Set Entry"
          ariaLabel="MPR Set Entry"
          headers={["Neighbour"]}
          rows={[["IP address of the selected Multipoint Relay neighbour"]]}
        />
        <TableBlock
          introText="MPR Selector Set Entry"
          ariaLabel="MPR Selector Set Entry"
          headers={["Selector", "Last Update"]}
          rows={[
            [
              "IP address of a neighbour that selected this node as its MPR",
              "Tick when this entry was last refreshed",
            ],
          ]}
        />
        <SourceBlock>
          <TextBlock>
            IETF RFC 7181 "[The Optimized Link State Routing Protocol Version 2
            (OLSRv2)](https://datatracker.ietf.org/doc/html/rfc7181)".
          </TextBlock>
        </SourceBlock>
      </div>

      <div className="help-page__chapter" id="topology-discovery">
        <h2 className="help-page__chapter-title">Topology Discovery (TC Messages)</h2>
        <TextBlock>
          While HELLO messages build a localized view of the network (1-hop and 2-hop), **Topology
          Control (TC) messages** are used to disseminate routing information across the entire
          mesh. TC messages are generated strictly by nodes that have been selected as an MPR by at
          least one neighbor. By default, these messages are broadcast every **5 seconds**.
        </TextBlock>
        <TextBlock>
          Instead of declaring all of its links, an MPR only declares its **MPR Selectors** - the
          specific nodes that selected it as a relay. This significantly minimizes the size of the
          control messages while providing enough information to calculate shortest-path routes to
          all destinations.
        </TextBlock>
        <PacketBlock
          introText="TC Message Structure"
          rows={[
            [
              {
                label: "ANSN",
                bits: 16,
                description:
                  "Advertised Neighbour Sequence Number. Incremented upon topology changes.",
              },
              {
                label: "TTL",
                bits: 8,
                description: "Maximum forwarding depth still allowed.",
              },
            ],
            [
              {
                label: "Advertised Neighbour Address",
                bits: 32,
                description: "IP address of a node that has selected the sender as an MPR.",
              },
            ],
          ]}
        />
        <TextBlock>
          When a node receives a TC message, it verifies the **Advertised Neighbour Sequence Number
          (ANSN)**. If the sequence number is newer than the currently stored information for that
          originator, the node accepts the message, updates its **Topology Set**, and (if the
          receiving node is an MPR) forwards the message to its neighbours. Stale messages are
          quietly dropped to prevent routing loops and processing overhead.
        </TextBlock>
        <TableBlock
          introText="Topology Set Entry"
          ariaLabel="Topology Set Entry"
          headers={["Destination", "Last Hop", "ANSN", "Last Update"]}
          rows={[
            [
              "IP of the MPR Selector",
              "IP of the MPR that generated the TC",
              "Sequence number of the TC message",
              "Tick when this topology entry was last refreshed",
            ],
          ]}
        />
      </div>

      <div className="help-page__chapter" id="route-selection">
        <h2 className="help-page__chapter-title">Route Selection</h2>
        <TextBlock>
          Because OLSR is a proactive protocol, the routing table is continuously maintained and
          updated independently of data traffic. The routing table is calculated using **Dijkstra's
          Shortest Path First (SPF) algorithm**, relying on the combined data from the local
          Neighbor Table (built via HELLO messages) and the global Topology Table (built via TC
          messages).
        </TextBlock>
        <TextBlock>
          The calculation occurs in a strict order to ensure optimal paths: All entries in the
          routing table are cleared. Symmetric 1-hop neighbours (from the Neighbour Set) are added
          with a hop count of 1. Strict 2-hop neighbours are added with a hop count of 2, using the
          appropriate 1-hop neighbour as the next hop. The algorithm iteratively consults the
          Topology Set. For each node added in the previous step, it looks for nodes that have
          selected it as an MPR (its MPR selectors). These destinations are added to the routing
          table with an incremented hop count.
        </TextBlock>
        <TextBlock>
          This shortest-path calculation ensures that the resulting routes rely strictly on the
          backbone of Multipoint Relays. Whenever a HELLO message indicates a lost link, or a TC
          message announces a topology change (via a new ANSN), the node discards affected paths and
          immediately recalculates the routing table, ensuring data packets are always forwarded
          along the most up-to-date shortest path.
        </TextBlock>
        <TableBlock
          introText="Routing Table Entry"
          ariaLabel="Routing Table Entry"
          headers={["Destination", "Next Hop", "Metric", "ANSN", "Last Update"]}
          rows={[
            [
              "Destination IP address",
              "Immediate next-hop IP address",
              "Hop count to destination",
              "ANSN of the TC message that produced this route",
              "Tick when this entry was last recalculated",
            ],
          ]}
        />
      </div>
    </section>
  );
}
