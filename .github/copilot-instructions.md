# Copilot Workspace Instructions

This repository provides custom agents, skills, and prompts for multi-role planning.

## Structure
- .github/agents: role-specific agents (orchestrator, pm, dev, qa, ux, sec, ops, data)
- .github/skills: reusable skill playbooks
- .github/prompts: slash-command prompts

## How to use
- Pick the "orchestrator" agent in Chat > Agent mode.
- Describe the system you want to build and constraints.
- The orchestrator will delegate to pm/dev/qa and optional ux/sec/ops/data, then synthesize a plan.

## Conventions
- Keep outputs concise and actionable.
- Prefer checklists, milestones, and acceptance criteria.
