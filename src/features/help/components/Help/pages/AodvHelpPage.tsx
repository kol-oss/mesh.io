import { useEffect } from "react";

import PacketStructure from "@/features/help/components/Help/PacketStructure";
import SourceBlock from "@/features/help/components/Help/SourceBlock";
import TableBlock from "@/features/help/components/Help/TableBlock";
import TextBlock from "@/features/help/components/Help/TextBlock";

const SECTION_IDS = [
  "aodv",
  "what-you-need-to-know",
  "distance-vector-routing",
  "route-discovery",
  "route-maintenance",
  "routing-table",
  "route-selection",
];

export default function AODVHelpPage() {
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
          window.history.replaceState(null, "", `/docs/aodv#${sectionId}`);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="help-page__section" id="aodv">
      <div className="help-page__big-header">
        <h1 className="help-page__big-title">AODV</h1>
        <p className="help-page__big-subtitle">Ad hoc On-Demand Distance Vector Routing</p>
      </div>

      <div className="help-page__chapter" id="what-you-need-to-know">
        <h2 className="help-page__chapter-title">What You Need to Know</h2>
        <TextBlock>
          The **Ad hoc On-Demand Distance Vector (AODV)** protocol is a widely deployed reactive
          routing protocol standardized in 2003 under **RFC 3561**. Designed for mobile ad hoc
          networks, it discovers routes strictly on-demand, which significantly reduces network
          overhead compared to proactive table-driven protocols like DSDV, OLSR or B.A.T.M.A.N.
        </TextBlock>
        <TextBlock>
          While DSR heavily inspired AODV, they fundamentally differ in data delivery. AODV relies
          on traditional hop-by-hop routing rather than source routing. This eliminates the heavy
          packet header overhead seen in DSR, making AODV much more suitable for larger networks
          with longer routes and constrained bandwidth.
        </TextBlock>
        <SourceBlock>
          <TextBlock>
            IETF RFC 3561 "[Ad hoc On-Demand Distance Vector (AODV)
            Routing](https://datatracker.ietf.org/doc/html/rfc3561)".
          </TextBlock>
        </SourceBlock>
      </div>

      <div className="help-page__chapter" id="distance-vector-routing">
        <h2 className="help-page__chapter-title">Distance Vector & Sequence Numbers</h2>
        <TextBlock>
          Instead of embedding the full path inside the packet header like DSR, AODV uses hop-by-hop
          forwarding. Each node maintains a standard routing table. When a data packet arrives, the
          node simply looks up the destination IP to find the immediate next hop, preserving
          precious payload capacity for user data.
        </TextBlock>
        <TextBlock>
          A core innovation in AODV is the use of **Destination Sequence Numbers** created by the
          destination node. These numbers act as a strictly increasing time-stamp for routing
          information. This mechanism ensures routes are fresh and strictly prevents the routing
          loops that often plague classic distance vector protocols.
        </TextBlock>
      </div>

      <div className="help-page__chapter" id="route-discovery">
        <h2 className="help-page__chapter-title">Route Discovery</h2>
        <TextBlock>
          **Route Discovery** activates when a source lacks a valid routing table entry for a
          destination. It broadcasts a **Route Request (RREQ)**. Unlike DSR, which accumulates
          addresses in the packet, AODV nodes receiving an RREQ simply record a *reverse route* back
          to the specific neighbor that successfully forwarded the request.
        </TextBlock>

        <PacketStructure
          introText="Route Request (RREQ) Message Structure"
          rows={[
            [
              {
                label: "Type",
                bits: 8,
                description: "RREQ control-message identifier.",
              },
              {
                label: "Flags (J/R/G/D/U)",
                bits: 16,
                description: "Join/Repair/Gratuitous/Destination-only/Unknown-sequence flags.",
              },
              {
                label: "Hop Count",
                bits: 8,
                description: "Hops from originator to current forwarding node.",
              },
            ],
            [
              {
                label: "RREQ ID",
                bits: 32,
                description: "Identifier for duplicate suppression.",
              },
            ],
            [
              {
                label: "Destination",
                bits: 32,
                description: "Requested destination node.",
              },
            ],
            [
              {
                label: "Destination Sequence Number",
                bits: 32,
                description:
                  "Last known destination sequence number (may be unknown in the simulator).",
              },
            ],
            [
              {
                label: "Originator Address",
                bits: 32,
                description: "Node that started route discovery.",
              },
            ],
            [
              {
                label: "Sequence Number",
                bits: 32,
                description: "Current originator sequence number.",
              },
            ],
          ]}
        />

        <TextBlock>
          When the RREQ reaches the target or an intermediate node with a fresh enough route, it
          generates a **Route Reply (RREP)**. As this RREP is unicast back along the established
          reverse path, each intermediate node records a *forward route* to the destination,
          completing the reliable two-way hop-by-hop path.
        </TextBlock>

        <PacketStructure
          introText="Route Reply (RREP) Message Structure"
          rows={[
            [
              {
                label: "Type",
                bits: 8,
                description: "RREP control-message identifier.",
              },
              {
                label: "Prefix Size",
                bits: 16,
                description: "Modeled as 0 in the simulator.",
              },
              {
                label: "Hop Count",
                bits: 8,
                description: "Distance to destination at current forwarding node.",
              },
            ],
            [
              {
                label: "Destination",
                bits: 32,
                description: "Destination for which route is supplied.",
              },
            ],
            [
              {
                label: "Destination Sequence Number",
                bits: 32,
                description: "Fresh destination sequence used for route selection.",
              },
            ],
            [
              {
                label: "Originator Address",
                bits: 32,
                description: "Node that initiated the corresponding RREQ.",
              },
            ],
            [
              {
                label: "Lifetime",
                bits: 32,
                description: "Ticks for which installed route remains valid without refresh.",
              },
            ],
          ]}
        />
      </div>

      <div className="help-page__chapter" id="route-maintenance">
        <h2 className="help-page__chapter-title">Route Maintenance & Error Handling</h2>
        <TextBlock>
          **Route Maintenance** tracks active links. Unlike DSR's pure reliance on packet forwarding
          ACKs, AODV can utilize periodic broadcast **HELLO Messages** (RREPs with TTL=1) to
          maintain local neighbor connectivity. If a node suddenly stops hearing HELLO messages from
          a neighbor, it considers the link completely broken.
        </TextBlock>
        <TextBlock>
          When a link break is detected on an active route, the node generates a **Route Error
          (RERR)** packet. AODV utilizes a "precursor list" stored in the routing table, which
          tracks all neighboring nodes currently using this specific link. The RERR is unicast or
          broadcast to notify these dependent precursors.
        </TextBlock>
        <PacketStructure
          introText="Route Error (RERR) Message Structure"
          rows={[
            [
              {
                label: "Type",
                bits: 8,
                description: "RERR control-message identifier.",
              },
              {
                label: "Flags",
                bits: 16,
                description: "No-delete flag and reserved bits.",
              },
              {
                label: "DestCount",
                bits: 8,
                description: "Number of unreachable destinations in this message.",
              },
            ],
            [
              {
                label: "Unreachable Destination",
                bits: 32,
                description: "Destination invalidated by a detected link break.",
              },
            ],
            [
              {
                label: "Unreachable Destination Sequence Number",
                bits: 32,
                description: "Updated sequence paired with the unreachable destination entry.",
              },
            ],
          ]}
        />
        <PacketStructure
          introText="HELLO Message Structure"
          rows={[
            [
              {
                label: "Type",
                bits: 8,
                description: "HELLO control-message identifier in the simulator model.",
              },
              {
                label: "TTL",
                bits: 8,
                description: "Always 1 for local-neighbour sensing.",
              },
              {
                label: "Interval",
                bits: 16,
                description: "Configured HELLO interval used by neighbours.",
              },
            ],
            [
              {
                label: "Originator Address",
                bits: 32,
                description: "Neighbour announcing local reachability.",
              },
            ],
            [
              {
                label: "Destination Sequence Number",
                bits: 32,
                description: "Latest destination sequence advertised by neighbour.",
              },
            ],
            [
              {
                label: "Lifetime",
                bits: 32,
                description: "Route validity window refreshed by this HELLO.",
              },
            ],
          ]}
        />
        <TextBlock>
          Upon receiving a RERR, a node invalidates the broken route in its table and increments the
          destination sequence number to signify the route's decay. If the source node still
          requires communication, it must initiate a brand new RREQ, as AODV lacks DSR's packet
          salvaging or secondary cached alternate routes.
        </TextBlock>
      </div>

      <div className="help-page__chapter" id="routing-table">
        <h2 className="help-page__chapter-title">Routing Table</h2>
        <TextBlock>
          AODV abandons DSR's multi-path Route Cache in favor of a traditional **Routing Table**.
          Each node stores only a single optimal next-hop entry per destination. This drastically
          limits memory consumption and simplifies forwarding logic, though it sacrifices the
          immediate fallback redundancy found natively in DSR.
        </TextBlock>

        <TableBlock
          introText="AODV Routing Table Entry"
          ariaLabel="Routing Table Entry"
          headers={[
            "Destination",
            "Next Hop",
            "Metric",
            "Sequence Number",
            "Precursors",
            "Last Update",
          ]}
          rows={[
            [
              "Destination node id/name",
              "Immediate forwarding neighbour",
              "Hop count to destination (metric)",
              "Destination sequence number",
              "Neighbour list that depends on this route",
              "Tick when entry was last refreshed",
            ],
          ]}
        />

        <TextBlock>
          Each routing table entry maintains an active **Lifetime** timer. Every time a route is
          used to forward a data packet, this active timer is refreshed. If a route remains idle and
          the timer expires, the entry is invalidated, ensuring the network gracefully forgets
          obsolete or physically distant nodes over time.
        </TextBlock>
      </div>

      <div className="help-page__chapter" id="route-selection">
        <h2 className="help-page__chapter-title">Route Selection</h2>
        <TextBlock>
          Route selection in AODV is strictly deterministic and relies primarily on the
          **Destination Sequence Number**. When a node receives multiple RREPs for the exact same
          destination, it must always select the route carrying the highest (newest) sequence
          number, guaranteeing the absolute most up-to-date network path.
        </TextBlock>
        <TextBlock>
          If multiple RREPs arrive with the exact same Destination Sequence Number, AODV uses the
          **Hop Count** as the definitive tie-breaker. The protocol selects the route with the
          fewest intermediate hops. This rigid dual-metric approach ensures loops are completely
          avoided while still strictly prioritizing the shortest available path.
        </TextBlock>
      </div>
    </section>
  );
}
