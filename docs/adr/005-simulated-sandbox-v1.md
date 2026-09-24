# 005 — Simulated sandbox in v1, real cluster behind an interface

- **Status:** accepted
- **Date:** 2026-09-24
- **Decision ref:** PROMPT-v2.1 D10, §7.4

## Context

Debugging a broken pod is the skill the app is actually for, and it cannot be
taught with multiple choice alone. The obvious version is a real ephemeral
cluster per session — which means paying for compute, running untrusted commands,
and building a terminal that works on a 375px screen with an on-screen keyboard.

Every one of those is a project. None of them is the lesson.

## Decision

Scenarios are deterministic JSON snapshots in `content/scenarios/<id>.json`: a
sequence of steps, each pairing a fixed `command` and its `output` with a card,
plus a `resolution` shown at the end as if applied.

The user never types a command — they choose or tap. `log_tap` on a real
`kubectl describe` output is the same diagnostic skill as reading it in a
terminal, without the keyboard.

Access goes through a `SandboxProvider` interface — `start(scenarioId)`,
`step(sessionId, stepId, answer)`, `finish(sessionId)` — with two
implementations: `SimulatedProvider` now, and `K3sProvider` as a stub that throws
`NotImplemented` pointing at the later homelab phase.

## Consequences

- Zero infrastructure, zero cost, and no way for a session to run anything.
- Identical behaviour on every device, which also makes the flow E2E-testable.
- Authoring a scenario means capturing real output — so the snapshots have to come
  from an actual cluster, not from memory, or the lesson teaches output that does
  not exist.
- A scenario cannot react to an unexpected command, so it cannot teach
  exploration. That is the real cost of this decision and the reason the
  interface exists.
- The stub is committed, not omitted: it documents the seam and fails loudly
  rather than being quietly absent.
