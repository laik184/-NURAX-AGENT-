# Biometric Auth Agent (HVP)

## 1) Module Overview
This module delivers HVP-compliant biometric authentication orchestration for React Native mobile applications with Android/iOS support, PIN fallback, security posture checks, token protection, and session lifecycle management.

## 2) File Responsibilities
- `types.ts` (L0): contract definitions for requests, responses, security reports, and shared agent output envelope.
- `state.ts` (L0): immutable baseline state (`Object.freeze`).
- `orchestrator.ts` (L1): coordinates end-to-end flow across L2 agents only.
- `agents/*` (L2): isolated security/auth responsibilities per file.
- `utils/*` (L3): import-free helper utilities for crypto, platform abstraction, error normalization, and secure storage wrapper.
- `index.ts`: module exports.

## 3) Call Flow Diagram
```text
User → orchestrator
     → biometric-check.agent
     → fingerprint/faceid.agent
     → fallback-pin.agent
     → token-protector.agent
     → session-manager.agent
```

## 4) Security Features
- AES-GCM encryption/decryption and SHA-256 hashing.
- Secure token persistence wrapper for Keychain/Keystore style usage.
- Root/jailbreak, emulator, and debug-mode posture blocking.
- Brute-force/repeated-failure threat detection with lockout window.

## 5) Import Rules
- `orchestrator` → agents only (+ L0 contracts/state).
- `agents` → utils/types only.
- `utils` → no imports.
- No shared mutable state.
