# generation/mobile/android

## Purpose
Unified Android code generation domain.
Covers native Kotlin development: ViewModels, networking, navigation.

Previously split across three fragmented directories:
- `android/` (viewmodel only)
- `android-native/` (networking only)
- `android-navigation/` (navigation only)

All merged here in refactor April 2026.

## Sub-modules

| Directory | Purpose |
|---|---|
| `viewmodel/kotlin-viewmodel-generator/` | Generates Kotlin ViewModel + StateFlow + Repository wiring |
| `networking/kotlin-retrofit/` | Generates Retrofit clients, interceptors, error handlers |
| `navigation/` | Generates Jetpack Navigation graphs, deep links, route guards |

## Flow
```
Android generation request
  → router selects sub-module (viewmodel | networking | navigation)
  → sub-module orchestrator runs agents
  → generates Kotlin source files
```
