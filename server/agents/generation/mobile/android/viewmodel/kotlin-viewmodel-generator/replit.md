# Kotlin ViewModel Generator (HVP)

## 1) ViewModel generation flow

1. `orchestrator.ts` validates incoming config using `validation.agent.ts`.
2. `state-generator.agent.ts` creates the Kotlin `UiState` data class.
3. `intent-mapper.agent.ts` creates the Kotlin sealed `UiIntent` contract.
4. `repository-connector.agent.ts` generates repository execution mapping.
5. `coroutine-handler.agent.ts` creates `viewModelScope.launch` intent handling.
6. `viewmodel-builder.agent.ts` assembles the final Kotlin ViewModel file using templates.

## 2) File responsibilities

- **L1**: `orchestrator.ts` only coordinates generation steps and state transitions.
- **L2**: `agents/*.agent.ts` each own one concern (validation, state, intent, coroutine, repository, final class build).
- **L3**: `utils/*.util.ts` provide naming, logging, flow helpers, and Kotlin file template formatting.
- **L0**: `types.ts` defines contracts and output shape; `state.ts` stores runtime generator state.

## 3) Import relationships

- `orchestrator.ts` imports from `agents`, `utils`, `types`, and `state`.
- `agents` import only from `utils` and `types`.
- `utils` are leaf helpers and import only from `types` when necessary.
- No agent-to-agent imports are used.

## 4) Example generated ViewModel (summary)

Given `featureName = "user"`, the system emits `UserViewModel.kt` containing:
- `data class UserUiState(...)`
- `sealed interface UserIntent`
- `class UserViewModel : ViewModel` with `StateFlow` or `LiveData`
- `onIntent(intent)` using `viewModelScope.launch(dispatcher)`
- repository delegation through generated intent mapping.
