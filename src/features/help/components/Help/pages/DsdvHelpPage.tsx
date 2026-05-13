import { useEffect } from "react";

import TableBlock from "@/features/help/components/Help/TableBlock";
import PacketStructure from "@/features/help/components/Help/PacketStructure";
import SourceBlock from "@/features/help/components/Help/SourceBlock";
import TextBlock from "@/features/help/components/Help/TextBlock";
import ModellingTrap from "@/features/help/components/Help/ModellingTrap";

const SECTION_IDS = [
  "dsdv",
  "what-you-need-to-know",
  "sequence-numbering-and-metrics",
  "full-dumps-and-incremental-updates",
  "routing-maintenance",
  "route-selection",
];

export default function DsdvHelpPage() {
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
          window.history.replaceState(null, "", `/docs/dsdv#${sectionId}`);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="help-page__section" id="dsdv">
      <div className="help-page__big-header">
        <h1 className="help-page__big-title">DSDV</h1>
        <p className="help-page__big-subtitle">Destination-Sequenced Distance-Vector Routing</p>
      </div>

      <div className="help-page__chapter" id="what-you-need-to-know">
        <h2 className="help-page__chapter-title">What You Need to Know</h2>
        <TextBlock>
          **Destination-Sequenced Distance-Vector Routing (DSDV)** is a table-driven routing
          protocol for mobile ad-hoc networks based on the classical [Bellman-Ford algorithm
          ](https://en.wikipedia.org/wiki/Bellman%E2%80%93Ford_algorithm). Developed in 1994, it was
          groundbreaking for its time because it successfully solved the "count-to-infinity" problem
          and guaranteed freedom from routing loops - major limitations of traditional
          distance-vector protocols, especially in highly dynamic mobile environments.
        </TextBlock>
        <TextBlock>
          Despite being revolutionary for it's time, nowadays DSDV is considered more of a
          historical milestone than a practical solution for modern MANETs. It laid the groundwork
          for many modern protocols, but its nature and reliance on periodic broadcasts make it less
          efficient in larger or highly dynamic networks compared to more modern protocols like
          **OLSR** or **B.A.T.M.A.N.**, which incorporate mechanisms that are more optimized for
          needs of current networks.
        </TextBlock>
        <ModellingTrap>
          <TextBlock>
            The main motivation for including DSDV in this system is to provide a clear demonstation
            of how protocols creation idea developed from basis algorithms to more complex and
            modern routing protocols.
          </TextBlock>
        </ModellingTrap>
        <TextBlock>
          The core approach of the DSDV protocol is to require every node in the network to maintain
          a comprehensive routing table detailing the paths to all possible destinations. Each node
          tracks and constantly updates the best next hop and the total hop distance to all other
          nodes by regularly broadcasting routing information. The protocol's key innovation is the
          use of **sequence numbers** to ensure loop-free and up-to-date routing information, which
          was a significant advancement over traditional distance-vector routing protocols.
        </TextBlock>
        <SourceBlock>
          <TextBlock>
            Charles E. Perkins and Pravin Bhagwat "[Highly Dynamic Destination-Sequenced
            Distance-Vector Routing (DSDV) for Mobile
            Computers](https://www.cs.cornell.edu/people/egs/615/perkins94highly.pdf)".
          </TextBlock>
        </SourceBlock>
      </div>
      <div className="help-page__chapter" id="sequence-numbering-and-metrics">
        <h2 className="help-page__chapter-title">Sequence Numbering and Hop Count</h2>
        <TextBlock>
          To understand why DSDV uses sequence numbers, you first have to understand the flaw in
          traditional **Distance-Vector routing** (like the Bellman-Ford algorithm used in RIP). In
          traditional protocols, if a link breaks, nodes can end up continuously trading outdated
          information, blindly incrementing their hop counts in a loop until they reach *infinity*.
          This is known as the count-to-infinity problem and creates severe routing loops. DSDV
          solves this entirely by introducing **Sequence Numbers**, which act as a strict timestamp
          for routing updates.
        </TextBlock>
        <SourceBlock>
          <TextBlock>
            Marish Lakshmanan "[The Count to Infinity Problem: A Deep
            Dive](https://medium.com/@sakthi9481/the-count-to-infinity-problem-a-deep-dive-512182754a85)".
          </TextBlock>
        </SourceBlock>
        <TextBlock>
          Every routing update in DSDV carries a *sequence number* created by the node itself. This
          number is the ultimate source of truth for how fresh a route is. The most critical
          mechanic of these sequence numbers is the **Even/Odd Rule**. Under normal, stable
          operating conditions, sequence numbers are always even. When a destination node broadcasts
          its own routing update to its neighbors, it increments its own sequence number by 2 (e.g.,
          100, 102, 104). An even number guarantees that the update originated from the destination
          itself and that the path is active.
        </TextBlock>
        <TextBlock>
          Odd numbers are essentially death certificates for a route. If a node detects that its
          link to next-hop node has broken, it takes the last known even sequence number it had,
          increments it by 1 (making it an odd number), and sets the hop count (metric) to
          *infinity*. The node then broadcasts this odd number, and when other nodes see the odd
          number, they immediately know the link is severed and discard the route.
        </TextBlock>
        <ModellingTrap>
          <TextBlock>
            The sequence number for starting tick *is always zero* and incremented on changes to the
            routing table inside **Incremental Update** or **Full Dump** routing refresh steps.
          </TextBlock>
        </ModellingTrap>
        <TextBlock>
          The DSDV **uses hop count as its sole routing metric**, what is considered legacy in
          todays technology. To understand this choice, it is necessary to first consider the
          limitations of more complex approaches that incorporate dynamic link characteristics like
          bandwidth or latency. Such metrics fluctuate constantly, causing frequent route changes
          and excessive routing updates in mobile networks. The protocol instead uses destination
          sequence numbers to guarantee loop-free paths, with hop count acting as a tie-breaker,
          because stability and low update overhead were the key constraints for the technology of
          that time.
        </TextBlock>
      </div>
      <div className="help-page__chapter" id="full-and-incremental-updates">
        <h2 className="help-page__chapter-title">Full Dump and Incremental Update</h2>
        <TextBlock>
          Routing information in DSDV is maintained using two different types of routing messages:
          **Full Dumps** and **Incremental Updates**. They have the same structure and both
          broadcasted throughout the network to refresh routing information on other nodes, but the
          main difference is the payload size (number of entries in attached routing table) that are
          transmitted.
        </TextBlock>
        <PacketStructure
          introText="Destination-Sequenced Distance-Vector message"
          rows={[
            [
              {
                label: "Packet Type",
                bits: 8,
                description:
                  "Identifies the type of DSDV message: 0x01 for Full Dump; 0x02 for Incremental Update.",
              },
              {
                label: "Reserved",
                bits: 24,
                description: "Padding to maintain 32-bit alignment.",
              },
            ],
            [
              {
                label: "Entry Count",
                bits: 32,
                description: "The number of route entries contained in this packet.",
              },
            ],
            [
              {
                label: "Destination Address",
                bits: 32,
                description: "The IP address of the destination node for this route entry.",
              },
              {
                label: "Sequence Number",
                bits: 32,
                description: "The latest sequence number received for this destination.",
              },
              {
                label: "Metric",
                bits: 32,
                description: "The number of hops to reach the destination.",
              },
            ],
          ]}
        />
        <TextBlock>
          A **Full Dump** is a message in which a node sends its *entire routing table*. This means
          it includes information about all known destinations, along with their hop counts and
          sequence numbers. Full Dumps are used as a reset or synchronization tool. Because wireless
          networks at the time were unreliable and packets could be lost, relying only on small
          updates would eventually lead to inconsistencies. Full Dumps *periodically* refresh all
          routing information and correct accumulated errors. However, they are expensive because
          they consume a lot of bandwidth and increase network congestion, especially as the number
          of nodes grows.
        </TextBlock>
        <TextBlock>
          An **Incremental Update**, in contrast, is much smaller: it contains only the routing
          entries that have changed since the last update was sent. This makes Incremental Updates
          efficient and well-suited for frequent, small changes in a mobile network. The drawback is
          that they are less reliable: if one is lost or delayed, neighboring nodes may temporarily
          hold outdated or inconsistent routing information.
        </TextBlock>
        <TextBlock>
          The reason DSDV uses both types is to solve a fundamental problem in early ad-hoc
          networking: no single message type could provide both efficiency and reliability.
          Incremental Updates reduce overhead and allow fast reaction to changes, while Full Updates
          ensure that the network does not drift into inconsistency over time. This hybrid approach
          reflects the technological limitations of the period, where networks needed to function
          under unstable connectivity and strict resource constraints. The main disadvantage of this
          approach is added complexity and the fact that routing consistency is not immediate - it
          mainly depends on the timing of both periodic Full Updates and frequent Incremental
          Updates, which can still lead to temporary inconsistencies, especially in highly dynamic
          networks, and also flood the network with excessive control messages.
        </TextBlock>
        <ModellingTrap>
          <TextBlock>
            Due to the sequential and deterministic nature of the system, both Incremental Updates
            and Full Dumps are sent in specified intervals. In the real world, Full Dumps are sent
            **every 15-30 seconds**, but it is recommended to set their value as 5 ticks inside the
            simulator.
          </TextBlock>
        </ModellingTrap>
      </div>
      <div className="help-page__chapter" id="routing-maintenance">
        <h2 className="help-page__chapter-title">Routing Maintenance</h2>
        <TextBlock>
          Every node in a DSDV network, as part of the proactive protocol family, maintains a
          routing table that acts as its continuously evolving map of the network. Each entry in
          this table corresponds to a specific destination node. A standard entry holds the
          destination's network address, the address of the immediate next-hop neighbor required to
          reach that destination, the current metric (total hop count), and the most recent sequence
          number received for that destination. Additionally, tables track the timestamp of the last
          received update to facilitate staleness checks and protocol timeouts.
        </TextBlock>
        <TableBlock
          introText="Routing Table entry"
          ariaLabel="Routing Table entry"
          headers={["Destination", "Next Hop", "Metric", "Sequence Number", "Last Update"]}
          rows={[
            [
              "Destination IP address",
              "Next hop IP address",
              "Metric (total hop count)",
              "Most recent sequence number",
              "Timestamp of the last received update",
            ],
          ]}
        />
        <TextBlock>
          When a node receives a routing update (either a Full Dump or an Incremental Update) from a
          neighbor, it must process the incoming data to keep its own table current. The receiving
          node first takes the advertised routes and **increments the metric (hop count)** of each
          by one, accounting for the single hop between itself and the transmitting neighbor. It
          then evaluates these adjusted routes against its existing routing table. If an incoming
          route boasts a newer sequence number, or an identical sequence number but a lower hop
          count, the node *replaces its current entry with this superior information*. If its own
          table changes as a result, the node queues an Incremental Update to broadcast these
          changes to its own neighbors.
        </TextBlock>
        <TextBlock>
          In highly dynamic environments, links break frequently as nodes move out of range or power
          down. DSDV handles these link failures passively through strict timeouts. If a node does
          not receive any routing updates from or regarding a specific next-hop neighbor for a
          duration equal to **three Full Dump intervals** (approximately 45 seconds in a real-world
          scenario), it assumes the link to that neighbor is severed. Upon detecting this failure,
          the node immediately invalidates the route: it increments the last known sequence number
          for that destination by 1 (creating an odd sequence number) and **sets the hop count to
          infinity**. This localized broken link realization is then rapidly broadcast to other
          nodes to purge the dead route from the wider network.
        </TextBlock>
        <ModellingTrap>
          <TextBlock>
            The algorithm for detecting broken links is simplified to make simulation faster and
            more deterministic. The connection to the node will be considered broken if the was no
            routing messages from it during **one Full Dump interval plus Route Timeout** ticks.
          </TextBlock>
        </ModellingTrap>
        <TextBlock>
          To prevent excessive broadcasting and network congestion, the theoretical DSDV protocol
          utilizes a mechanism known as **Settling Time**. In a wireless mesh, a node might receive
          a valid route with a newer sequence number but a sub-optimal hop count, only to receive a
          more optimal route moments later from a different neighbor. If the node blindly
          broadcasted the first update immediately, it would force the whole network to process a
          temporary, inefficient path. By delaying the broadcast of fluctuating routes by a
          calculated settling time, nodes wait to ensure they have the most stable and optimal path
          before advertising it further, thereby suppressing broadcast storms.
        </TextBlock>
        <ModellingTrap>
          <TextBlock>
            The Settling Time mechanism is not implemented in this simulation to keep the focus on
            the core routing and sequence-number logic. In this simplified model, updates are
            processed and propagated immediately without delay.
          </TextBlock>
        </ModellingTrap>
      </div>
      <div className="help-page__chapter" id="route-selection">
        <h2 className="help-page__chapter-title">Route Selection</h2>
        <TextBlock>
          Route selection in DSDV is performed using the freshest sequence number received for each
          destination. After stale routes are filtered out by verifying the **Sequence Number**,
          each valid update contributes a path metric derived strictly from the accumulated hop
          count. The node maintains a single active next hop per destination and updates it whenever
          superior routing information is broadcasted by neighbors.
        </TextBlock>
        <TextBlock>
          The preferred route is always the one with the **greatest sequence number**, meaning the
          path that relies on the most recently generated routing data from the target node. In
          cases where sequence numbers from different neighbors are identical, the route with the
          lowest hop count is selected. This ensures that routing decisions prioritize absolute
          loop-freedom and data freshness, while still optimizing for the shortest path when route
          ages are equal.
        </TextBlock>
      </div>
    </section>
  );
}
