# mesh.io

A network simulation and visualization application. Design mesh network topologies, configure routing protocols, and run step-by-step simulations to inspect how routing tables evolve.

---

## Features

- **Visual topology editor** — drag-and-drop canvas to place peers, draw links, and position obstacles
- **Multi-protocol simulation** — supports BATMAN, DSDV, AODV, DSR, and OLSR routing protocols; each peer runs one protocol independently
- **Step-by-step playback** — define manual steps (message send, peer move, toggle) and navigate through them event by event
- **Per-event routing table inspection** — routing tables update for every event inside a step, not just at step boundaries
- **Keyboard navigation** — `←` / `→` to move between events, `A` / `D` to move between steps
- **Entity copy/paste** — select a peer or obstacle, press `Ctrl+C` / `Ctrl+V` to duplicate it at X+100
- **Workspace import/export** — save and load full workspace state as JSON
- **Simulation animation** — animated message propagation and peer movement on canvas
- **Properties sidebar** — inspect and edit entity and step properties in detail

---

## Getting Started

### Prerequisites

- Node.js 22+
- npm

### Install

```bash
npm install
```

### Run development server

```bash
npm run dev
```

Opens at `http://localhost:5173` by default.

### Build for production

```bash
npm run build
```

Output is placed in `dist/`.

### Lint

```bash
npm run lint
```

---

## Running Tests

Unit tests cover the simulation processor (protocol modules, event recording, graph snapshots).

```bash
npm run test
```

Run once with coverage:

```bash
npm run test -- --ci --coverage
```

Tests are located in `src/features/processor/__test__/`.

---

## Project Structure

```
src/
  app/                  Global styles and providers
  features/
    board/              Konva canvas, drag/create/animate hooks, board store
    event/              Event description panel and routing table inspector
    navigation/         Step timeline and entity list sidebar
    processor/          Simulation engine (runs in a Web Worker)
      module/           Protocol implementations: batman/, dsdv/, aodv/, dsr/, olsr/
      network/          graphology-based live network graph
      types/            Shared processor types and protocol record types
      worker/           Web Worker entry point
    properties/         Properties sidebar for entity/step editing
    tools/              Toolbar components and tool mode management
  shared/
    components/         Reusable UI components (Tooltip, Toast, Select, …)
    store/              Redux slices: peers, links, obstacles, steps, simulation, display
    types/              Domain types: entities, steps, events, simulation, protocols
    utils/              Pure helpers: navigation, simulation, migration, math
```

---

## Adding a New Routing Protocol

1. **Define record types** — create `src/features/processor/types/protocols/<name>.ts` with the routing table structure(s) your protocol uses.

2. **Add the protocol constant** — add a new entry to the `RoutingProtocol` enum in `src/shared/types/common/protocols.ts`.

3. **Implement the module** — create `src/features/processor/module/<name>/` with a class that extends `BaseModule` and implements:
   - `read(message)` — handle an incoming message
   - `refresh(action?)` — periodic protocol refresh (OGM, dump, hello, …)
   - `send(packet)` — route and forward a user packet
   - `getTables(): RoutingStructureType` — export current routing structures for display

4. **Register the module** — add a case for the new protocol in `src/features/processor/utils/module.ts` so the simulation manager instantiates it.

5. **Add protocol tables to the discriminated union** — extend `ProtocolTables` in `src/features/processor/types/peerTables.ts` with a new variant that has `protocol: typeof RoutingProtocol.<NAME>` as discriminator.

6. **Update `buildProtocolTables`** — add a case to the exhaustive switch in `src/features/processor/utils/tables.ts`.

7. **Add a table inspector component** — create `src/features/event/components/TableStructure/<Name>TableStructure.tsx` and wire it into `TableStructure.tsx`.

8. **Add default configuration** — add defaults in `src/shared/constants/protocols/protocol.ts` and a configuration type in `src/shared/types/model/configurations.ts`.

9. **Write unit tests** — add a test file under `src/features/processor/__test__/module/` following the existing pattern.
