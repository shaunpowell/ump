# Ump

**Spec-driven testing and development for workflow automation.**

Ump is an open-source workflow execution engine that runs n8n workflow JSON in isolation — no n8n server required, no Docker, no licensing concerns. Define what a workflow should do, run it against real inputs with mocked dependencies, and get a pass/fail result you can trust in CI.

---

## The problem

Workflow automation platforms like n8n are great for building automations. They're terrible for testing them. The only way to know if your workflow works is to run the whole thing in production and hope for the best. There's no way to:

- Test a specific section of a workflow in isolation
- Mock external services (Gmail, Google Sheets, APIs) without triggering real calls
- Define expected behaviour before building the workflow
- Run regression tests in CI after every change

Ump fixes this.

---

## How it works

Ump reads a workflow JSON file (exported from n8n) and a spec file (written by you), then executes the selected nodes in-process with mocked dependencies substituted. No n8n instance needed at runtime.

```
workflow.json  +  spec.yaml  →  ump run  →  pass / fail
```

A spec defines:
- Which nodes to run (by name or ID)
- What input data to inject at the entry node
- Which external nodes to mock (Gmail, Sheets, etc.) and what they should return
- What the output should look like

```yaml
suite: Classifier LLM Chain
workflow: workflows/remittance.json
entry: Loop Over Items
exit: If
mocks:
  Get many messages:
    returns: fixtures/gmail-batch.json
tests:
  - id: cls-001
    description: Classic remittance subject
    input:
      Subject: "Remittance Advice - INV#1234"
    expect:
      port: 0        # routed to the "remittance" branch
  - id: cls-002
    description: Service agreement should be other
    input:
      Subject: "Service Agreement 2026"
    expect:
      port: 1        # routed to the "other" branch
```

Run it:

```bash
ump run --spec specs/classifier.yaml
# ✓ cls-001  Classic remittance subject
# ✓ cls-002  Service agreement should be other
# 2/2 passed
```

---

## Spec-driven development

Ump is designed to support a spec-first workflow development methodology — the same way TDD works for code.

1. **Write the spec** — define what the workflow should do before building it
2. **Run the spec** — watch it fail (the workflow doesn't exist yet)
3. **Build the workflow** — in n8n, guided by the spec
4. **Run the spec again** — watch it pass
5. **Commit both** — the spec and the workflow JSON live together in git

The spec becomes living documentation. When you change a prompt, adjust logic, or swap a model, you run Ump and know immediately whether the workflow still behaves as intended.

---

## Platform support

Ump reads workflow JSON as an input format. Today it supports **n8n**. Support for Make, Activepieces, and other platforms is planned.

| Platform    | Status      |
|-------------|-------------|
| n8n         | In progress |
| Make        | Planned     |
| Activepieces| Planned     |

---

## Node support

Ump implements the node types that matter for logic and LLM workflows. External service nodes (Gmail, Google Sheets, HTTP APIs) are mocked via the spec — you define what they return rather than calling the real service.

| Node type                    | Status      |
|------------------------------|-------------|
| Set / Edit Fields            | In progress |
| If / Switch                  | In progress |
| Code (JavaScript)            | In progress |
| HTTP Request                 | In progress |
| Ollama / LLM Chain           | In progress |
| Extract from File (PDF)      | In progress |
| Aggregate / Split            | In progress |
| Sort                         | In progress |
| Gmail, Sheets, etc.          | Mock only   |

---

## Installation

```bash
npm install -g ump
```

Requires Node.js 18+. No other dependencies.

---

## Usage

```bash
# Run all specs in the ./specs directory
ump run

# Run a single spec file
ump run --spec specs/classifier.yaml

# Run against a specific workflow file
ump run --spec specs/classifier.yaml --workflow workflows/remittance.json

# Verbose output — shows full node outputs for each test
ump run --verbose

# CI mode — exit code 0 if all pass, 1 if any fail
ump run --ci
```

---

## Project structure

```
ump/
  packages/
    engine/        # Workflow executor — MIT licensed, zero dependencies
    cli/           # ump command line tool
    chrome-ext/    # Browser extension for n8n canvas integration (coming soon)
  specs/           # Example spec files
  fixtures/        # Example fixture data
```

---

## Architecture

The **engine** is the core — a pure Node.js function that takes a workflow JSON, a spec, and a mock registry, walks the execution graph, runs each node handler in order, and returns the results. No network calls, no database, no server.

Each node type is a handler function. When the executor reaches a node, it checks the mock registry first — if there's a mock defined for that node in the spec, it returns the fixture data instead of calling the real handler. This is the entire mocking system.

The **CLI** wraps the engine with file loading, test reporting, and CI integration.

The **Chrome extension** (coming) adds a visual layer inside the n8n editor — right-click selected nodes to create a spec, view test results in a sidebar, run tests from the canvas. The extension is a thin UI shell; all execution happens via the engine.

---

## Why Ump?

In Australian rules football, the goal umpire stands behind the posts with one job: watch the ball cross the line and call it. Goal — two index fingers. Behind — one finger. No score — arms crossed. No debate, no appeal, no checking with anyone else. Just the call.

That's what this tool does for your workflows. You define the rules. Ump watches the ball cross the line and calls it.

In Australia, we call them umps. And `ump run` is very satisfying to type.

---

## Contributing

Ump is in early development. The engine and CLI are the priority. If you want to add a node handler, improve expression evaluation, or add support for a new workflow platform, PRs are welcome.

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup.

---

## Licence

The Ump engine and CLI are MIT licensed. Free to use, modify, and distribute.

The Chrome extension and any future SaaS features are separately licensed.

---

*Built in Melbourne, Australia.*
