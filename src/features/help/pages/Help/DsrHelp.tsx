import PacketBlock from "@/features/help/components/Block/PacketBlock";
import SourceBlock from "@/features/help/components/Block/SourceBlock";
import TableBlock from "@/features/help/components/Block/TableBlock";
import TextBlock from "@/features/help/components/Block/TextBlock";
import { useScroll } from "../../hooks/useScroll";

const SECTIONS = [
  "dsr",
  "what-you-need-to-know",
  "source-routing",
  "route-discovery",
  "route-maintenance",
  "route-cache",
  "route-selection",
];

export default function DsrHelp() {
  useScroll("dsr", SECTIONS);

  return (
    <section className="help-page__section" id="dsr">
      <div className="help-page__big-header">
        <h1 className="help-page__big-title">DSR</h1>
        <p className="help-page__big-subtitle">Dynamic Source Routing Protocol</p>
      </div>

      <div className="help-page__chapter" id="what-you-need-to-know">
        <h2 className="help-page__chapter-title">What You Need to Know</h2>
        <TextBlock>
          The **Dynamic Source Routing (DSR)** protocol is an efficient, reactive routing protocol
          standardized in 2007 under **RFC 4728**. Designed specifically for multi-hop wireless ad
          hoc networks, it allows mobile nodes to dynamically discover and maintain routes without
          existing infrastructure.
        </TextBlock>
        <TextBlock>
          Unlike table-driven protocols like OLSR or OSPF, DSR is purely **reactive** (on-demand).
          It eliminates the need for periodic routing advertisements, link-status sensing, or
          neighbor detection packets. This dramatically reduces control overhead, conserving battery
          power and bandwidth.
        </TextBlock>
        <TextBlock>
          DSR remains a foundational protocol in ad hoc networking theory, heavily influencing
          standards like AODV. Today, it is predominantly used in specialized research, simulations,
          and tactical military setups where its unique on-demand routing provides operational
          advantages over traditional proactive methods.
        </TextBlock>
        <SourceBlock>
          <TextBlock>
            IETF RFC 4728 "[The Dynamic Source Routing Protocol (DSR) for Mobile Ad Hoc Networks for
            IPv4](https://datatracker.ietf.org/doc/html/rfc4728)".
          </TextBlock>
        </SourceBlock>
      </div>

      <div className="help-page__chapter" id="source-routing">
        <h2 className="help-page__chapter-title">Source Routing</h2>
        <TextBlock>
          The defining characteristic of DSR is **Source Routing**. The sending node discovers and
          records the complete, hop-by-hop route to the destination. It then embeds this entire
          sequence of IP addresses directly inside the header of every data packet it transmits
          across the network.
        </TextBlock>
        <TextBlock>
          Intermediate nodes do not maintain active routing tables. They simply read the route
          embedded in the packet header to find the next hop. This stateless forwarding
          automatically prevents routing loops, as the entire path is strictly pre-defined and
          controlled entirely by the originating source node.
        </TextBlock>
        <TextBlock>
          A key disadvantage of DSR is the **routing overhead** caused by embedding the full path
          inside every packet. As routes lengthen, the header size grows proportionally. This
          continuous overhead consumes valuable bandwidth and significantly reduces the payload
          capacity available for actual user data.
        </TextBlock>
      </div>

      <div className="help-page__chapter" id="route-discovery">
        <h2 className="help-page__chapter-title">Route Discovery</h2>
        <TextBlock>
          **Route Discovery** is the mechanism by which a node wanting to send a packet to a
          destination obtains a source route. This process is only initiated when a route is
          actually needed (on-demand) and no valid route is found in the node's local Route Cache.
        </TextBlock>
        <TextBlock>
          The sender broadcasts a **Route Request (RREQ)**. Nodes lacking a cached route to the
          target append their address to the RREQ and rebroadcast it. To prevent endless network
          flooding, each RREQ carries a unique Identification number, allowing intermediate nodes to
          instantly discard duplicate requests.
        </TextBlock>

        <PacketBlock
          introText="Route Request (RREQ) Option Structure"
          rows={[
            [
              {
                label: "Option Type",
                bits: 8,
                description: "Identifies the option as a Route Request.",
              },
              {
                label: "Opt Data Len",
                bits: 8,
                description: "Length of the option, excluding Type and Length fields.",
              },
              {
                label: "Identification",
                bits: 16,
                description: "Unique ID generated by the initiator to detect duplicates.",
              },
            ],
            [
              {
                label: "Target Address",
                bits: 32,
                description: "The IP address of the node the initiator is trying to reach.",
              },
            ],
            [
              {
                label: "Address [1...n]",
                bits: 32,
                description: "List of intermediate IP path accumulating the route hop-by-hop.",
              },
            ],
          ]}
        />

        <TextBlock>
          Once the RREQ reaches the target or a node with a valid cached route, a **Route Reply
          (RREP)** is generated. This RREP contains the fully accumulated route. It is unicasted
          back to the initiator, most commonly by reversing the exact sequence of IP addresses
          recorded during the RREQ's outbound journey.
        </TextBlock>

        <PacketBlock
          introText="Route Reply (RREP) Option Structure"
          rows={[
            [
              {
                label: "",
                bits: 8,
                description: "",
              },
              {
                label: "Option Type",
                bits: 8,
                description: "Identifies the option as a Route Reply.",
              },
              {
                label: "Opt Data Len",
                bits: 8,
                description: "Length of the option data.",
              },
              {
                label: "Flags",
                bits: 1,
                description: "Last Hop External flag.",
              },
              {
                label: "Reserved",
                bits: 7,
                description: "Reserved bits for future use.",
              },
            ],
            [
              {
                label: "Address [1...n]",
                bits: 32,
                description: "The complete sequence of IP path making up the source route.",
              },
            ],
          ]}
        />
      </div>

      <div className="help-page__chapter" id="route-maintenance">
        <h2 className="help-page__chapter-title">Route Maintenance & Error Handling</h2>
        <TextBlock>
          **Route Maintenance** is the mechanism allowing a transmitting node to detect sudden
          topology changes. It alerts the sender if an active routing path breaks, an event that
          frequently occurs in ad hoc environments when mobile nodes physically move completely out
          of mutual wireless communication range.
        </TextBlock>
        <TextBlock>
          When a node forwards a packet, it is responsible for confirming that the packet has been
          received by the next hop. DSR can use MAC-layer acknowledgments (like IEEE 802.11 ACKs),
          passive acknowledgments (listening to the next node forwarding the packet), or explicit
          DSR network-layer ACKs.
        </TextBlock>
        <TextBlock>
          If a node fails to receive acknowledgment after a maximum number of retries, it considers
          the link broken. It then creates a **Route Error (RERR)** packet and sends it back to the
          original source of the data packet. The RERR indicates which specific link (from Node A to
          Node B) is broken.
        </TextBlock>

        <PacketBlock
          introText="Route Error (RERR) Option Structure"
          rows={[
            [
              {
                label: "Option Type",
                bits: 8,
                description: "Identifies the option as a Route Error.",
              },
              {
                label: "Opt Data Len",
                bits: 8,
                description: "Length of the error option.",
              },
              {
                label: "Error Type",
                bits: 8,
                description: "Type of error (e.g., 1 for Node Unreachable).",
              },
              {
                label: "Salvage",
                bits: 4,
                description: "Number of times the packet has been salvaged.",
              },
              {
                label: "Reserved",
                bits: 4,
                description: "Reserved bits.",
              },
            ],
            [
              {
                label: "Error Source Address",
                bits: 32,
                description: "The IP address of the node detecting the broken link.",
              },
            ],
            [
              {
                label: "Error Destination Address",
                bits: 32,
                description:
                  "The IP address of the node to which the RERR is sent (usually the initiator).",
              },
            ],
            [
              {
                label: "Type-Specific Information",
                bits: 32,
                description: "e.g., The IP address of the unreachable next hop.",
              },
            ],
          ]}
        />

        <TextBlock>
          Upon receiving a **Route Error (RERR)**, the originating source instantly purges any path
          utilizing the broken link from its Route Cache. If the node still has pending data to
          transmit and lacks alternative cached routes to the target, it will seamlessly trigger a
          completely new Route Discovery procedure.
        </TextBlock>
        <TextBlock>
          When encountering a broken link, a node checks its Route Cache instead of dropping the
          packet. If a valid path exists, it updates the route in the header and forwards the data.
          This recovery mechanism, known as **packet salvaging**, effectively minimizes data loss
          during rapid network topology changes.
        </TextBlock>
      </div>

      <div className="help-page__chapter" id="route-cache">
        <h2 className="help-page__chapter-title">Route Cache</h2>
        <TextBlock>
          Unlike traditional protocols that maintain a Routing Table with a single next-hop per
          destination, DSR utilizes a **Route Cache**. A node stores complete source routes that it
          has learned. A Route Cache can hold multiple different paths to the same destination.
        </TextBlock>
        <TextBlock>
          Nodes dynamically populate their cache not just through their own Route Discoveries, but
          aggressively through **promiscuous listening**. If a node overhears a data packet, RREQ,
          or RREP passing by, it can extract the routing information inside the header and add those
          paths to its own cache.
        </TextBlock>

        <TableBlock
          introText="Simplified Route Cache Entry"
          ariaLabel="Route Cache Entry"
          headers={["Destination", "Complete Path", "Expiration / State"]}
          rows={[
            [
              "Destination IP Address",
              "Array of IPs: [Hop 1, Hop 2, ..., Target]",
              "Timestamp / Timeout value for staleness",
            ],
          ]}
        />

        <TextBlock>
          Because Route Caches can easily retain stale routes when unnotified of topology shifts,
          DSR relies deeply on the RERR mechanism. These error packets aggressively propagate
          backward to purge obsolete link entries from multiple local caches, ensuring continuous
          routing accuracy throughout the dynamic network.
        </TextBlock>
      </div>

      <div className="help-page__chapter" id="route-selection">
        <h2 className="help-page__chapter-title">Route Selection</h2>
        <TextBlock>
          Route selection in DSR is primarily performed by the sender (initiator) before a packet is
          transmitted. When a node has data to send, it queries its local **Route Cache**. If
          multiple routes to the destination exist, the node must select the optimal one.
        </TextBlock>
        <TextBlock>
          DSR's standard routing metric defaults to the **shortest path**, prioritizing the absolute
          minimum hop count. Senders select the cached route traversing the fewest nodes. Because
          RREPs arrive fastest via short paths, the first cached route generally serves as the most
          optimal immediate choice.
        </TextBlock>
        <TextBlock>
          If a route fails during transmission and triggers a RERR, that specific path is forcefully
          evicted from the local cache. The sender instantly falls back to the next best available
          cached route. If no viable alternative routes remain, an entirely new Route Discovery
          procedure is systematically initiated.
        </TextBlock>
      </div>
    </section>
  );
}
