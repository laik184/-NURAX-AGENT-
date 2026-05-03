# Agents Folder

## Purpose
Contains single-responsibility file operation agents called only by the orchestrator.

## Who calls whom
- `orchestrator.ts` calls each agent directly.
- No agent calls another agent.

## Import diagram
`orchestrator -> file-*.agent`
