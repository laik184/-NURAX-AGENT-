# Utils Folder

## Purpose
Contains pure utilities for path safety, lock handling, normalization, diffing, and log formatting.

## Who calls whom
- Agents and orchestrator call utilities.
- Utilities do not depend on agents.

## Import diagram
`orchestrator/agents -> utils`
