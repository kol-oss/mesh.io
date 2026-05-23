import ModellingTrap from "@/shared/components/Block/ModellingTrap";
import SourceBlock from "@/shared/components/Block/SourceBlock";
import TextBlock from "@/shared/components/Block/TextBlock";
import { useScroll } from "../../hooks/useScroll";

const SECTIONS = [
  "what-you-need-to-know",
  "peers",
  "links",
  "obstacles",
  "steps",
  "refresh-steps",
  "events",
  "contributing",
];

export default function SystemHelp() {
  useScroll(SECTIONS);

  return (
    <section className="help-page__section" id="system">
      <div className="help-page__big-header">
        <h1 className="help-page__big-title">Mesh IO</h1>
        <p className="help-page__big-subtitle">Open-Source simulator of mesh routing protocols</p>
      </div>

      <div className="help-page__chapter" id="what-you-need-to-know">
        <h2 className="help-page__chapter-title">What You Need to Know</h2>
        <TextBlock>
          **Mesh IO** is an open-source educational and demonstrational web-based simulator designed
          to visualize and model mesh network routing protocols. It operates as a fully client-side
          application without a backend to minimize computational overhead, eliminate backend
          hosting costs, and make the application extremely easy to deploy.
        </TextBlock>
        <TextBlock>
          The core philosophy of the simulator is to provide an interactive 2D board where users can
          build topologies using a drag-and-drop interface, define simulation steps, and observe how
          routing protocols build structures and react to network changes in deterministic ways.
        </TextBlock>
        <ModellingTrap>
          <TextBlock>
            For educational clarity, OSI layers outside the **Network Layer** are completely
            abstracted. Complex IP addressing is replaced with readable textual names (backed by
            UUIDs), and physical link quality is evaluated purely via distance-based penalties.
          </TextBlock>
        </ModellingTrap>
      </div>

      <div className="help-page__chapter" id="peers">
        <h2 className="help-page__chapter-title">Network Peers</h2>
        <TextBlock>
          A **Peer** (or Node) is the fundamental entity in the mesh topology. Internally, the
          simulation engine tracks each peer using a unique UUID, but the UI abstracts this into a
          customizable, human-readable name for clarity. Every peer acts as a dynamic wireless
          router with a configurable **radial access zone**. If another active peer falls within
          this radius and the line of sight is clear from obstacles, a wireless link is
          automatically established.
        </TextBlock>
        <TextBlock>
          Beyond its basic placement, each peer possesses 2D coordinates and an activity status. The
          ability to toggle a peer's status off is a crucial modeling feature, allowing users to
          easily simulate sudden hardware failures, battery depletion, or node reboots.
        </TextBlock>
        <TextBlock>
          Every peer is assigned **exactly one routing protocol** at a time. Within the peer's
          settings panel, users gain full control over that protocol's internal variables. You can
          fine-tune specific configuration parameters, such as timeout durations or intervals for
          periodic packet broadcasts. These settings directly dictate how often the system generates
          automatic routing refresh steps for this specific node, shaping the network's overall
          behavior.
        </TextBlock>
      </div>

      <div className="help-page__chapter" id="links">
        <h2 className="help-page__chapter-title">Wired Links</h2>
        <TextBlock>
          A **Link** represents a dedicated, absolute connection between two specific peers within
          the network topology. Unlike wireless communication, which is strictly dependent on
          configured signal range, a wired connection remains persistently active regardless of the
          physical distance separating the nodes on the board.
        </TextBlock>
        <TextBlock>
          Furthermore, links are entirely immune to line-of-sight restrictions. The simulator's
          ray-casting mechanics and static obstacles do not affect these connections, meaning the
          link cannot be blocked or degraded by objects placed between the peers.
        </TextBlock>
      </div>

      <div className="help-page__chapter" id="obstacles">
        <h2 className="help-page__chapter-title">Obstacles</h2>
        <TextBlock>
          **Obstacles** are static, rectangular entities that can be placed across the interactive
          board to simulate real-world physical barriers, such as buildings or terrain. Their
          primary function in the topology is to disrupt wireless communication. Whenever an
          obstacle intersects the direct line of sight between two wireless peers, it acts as an
          impenetrable barrier to radio frequency propagation, shutting down the wireless link
          between those nodes.
        </TextBlock>
        <TextBlock>
          To accurately model signal blockage, the simulation engine employs a **ray casting**
          mechanism. The theoretical coverage area of each peer is divided into 180 distinct radial
          vectors. The system continuously evaluates whether any of these rays intersect with the
          geometric boundaries of an obstacle. Upon intersection, the signal ray is truncated at the
          point of impact.
        </TextBlock>
        <ModellingTrap>
          <TextBlock>
            While real-world radio frequency waves exhibit **diffraction** (the ability to bend
            around solid corners or edges), this phenomenon is intentionally omitted. Abstracting
            this behavior reduces computational overhead and maintains strict visual clarity,
            ensuring the core routing concepts remain easy to observe in an educational context.
          </TextBlock>
        </ModellingTrap>
      </div>

      <div className="help-page__chapter" id="steps">
        <h2 className="help-page__chapter-title">User Steps</h2>
        <TextBlock>
          The progression of the simulation is entirely decoupled from real-world chronological
          time. Instead, the underlying engine operates on a discrete, sequential counter designated
          as a **Tick** (an integer value beginning at 1). This tick-based architecture establishes
          a generalized, deterministic unit of time, allowing users to analyze complex network state
          transitions at a controlled and observable pace.
        </TextBlock>
        <TextBlock>
          Within this timeline, users can manually schedule **User Steps** to actively interact with
          the simulated environment and evaluate protocol behavior under various operational
          conditions. The system supports three primary types of manual interventions: **Message**,
          which transmits a basic payload from a source to a destination relying entirely on the
          currently established routing tables, **Move**, which dynamically alters a peer's spatial
          coordinates to test route recalculation in mobile scenarios, and **Toggle Status**, which
          forcibly activates or deactivates a peer or link to simulate abrupt hardware failures or
          network partitions.
        </TextBlock>
        <ModellingTrap>
          <TextBlock>
            To guarantee a stable initial state, user steps can only be scheduled starting from
            **Tick 2**. First tick is strictly reserved for automated protocol initialization,
            allowing all active nodes sufficient time to exchange foundational routing data and
            establish a base topology before any user-induced variables are introduced.
          </TextBlock>
        </ModellingTrap>
      </div>

      <div className="help-page__chapter" id="refresh-steps">
        <h2 className="help-page__chapter-title">Refresh Steps</h2>
        <TextBlock>
          In contrast to user-initiated actions, **Routing Refresh Steps** are autonomously
          scheduled by the simulation engine in strict accordance with each peer's defined protocol
          configuration. For instance, should a protocol require the periodic dissemination of
          topological data, the system programmatically populates the timeline with the necessary
          refresh iterations at the specified tick intervals without requiring manual user input.
        </TextBlock>
        <TextBlock>
          To optimize computational load, these automated steps are generated only up to the final
          chronologically scheduled user step. Furthermore, when both user steps and refresh steps
          occupy the same tick, the engine enforces a strict execution hierarchy: user steps are
          processed first. This deliberate sequencing guarantees that the automated routing
          protocols can immediately detect, react to, and propagate any manual topological changes
          (such as node relocation or status modifications) introduced during that specific
          timeframe.
        </TextBlock>
      </div>

      <div className="help-page__chapter" id="events">
        <h2 className="help-page__chapter-title">Events</h2>
        <TextBlock>
          Upon initialization of the simulation, the engine systematically translates the spatial 2D
          topology into a logical network graph, executing the timeline in a strictly deterministic
          manner. During this phase, every macroscopic Step is decomposed into a series of atomic,
          sequential **Events**. A single periodic refresh step, for example, may trigger a
          transmission event, which subsequently cascades into multiple packet processing and
          routing table update events across adjacent receiving nodes.
        </TextBlock>
        <TextBlock>
          This granular, event-driven architecture successfully isolates the overarching network
          state into discrete micro-moments. Consequently, users are empowered to comprehensively
          inspect each event, enabling the real-time visualization of packet payloads, the exact
          configuration of routing structures, and the explicit derivation of calculated metrics at
          that exact instant in the simulation.
        </TextBlock>
        <ModellingTrap>
          <TextBlock>
            To further bridge the gap between practical simulation and theoretical understanding,
            each event interface features a contextual *Read More* directive. This integration
            provides direct navigation to the corresponding protocol documentation, facilitating a
            seamless transition between empirical observation and academic study of the underlying
            routing algorithms.
          </TextBlock>
        </ModellingTrap>
      </div>

      <div className="help-page__chapter" id="contributing">
        <h2 className="help-page__chapter-title">Contributing</h2>
        <TextBlock>
          This system is an open-source project under *MIT license* aimed at making network routing
          concepts accessible and visual for students and educators. Since the application is built
          entirely on the frontend using React and TypeScript, it is highly approachable for web
          developers. Whether you want to implement a new routing protocol, enhance the user
          interface, or fix bugs, contributions are welcome.
        </TextBlock>
        <SourceBlock>
          <TextBlock>
            The **Mesh IO** project is developed in the dedicated [GitHub
            repository](https://github.com/kol-oss/mesh.io).
          </TextBlock>
        </SourceBlock>
      </div>
    </section>
  );
}
