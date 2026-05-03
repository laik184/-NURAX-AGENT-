import { StateContainerType } from '../types.js';

export interface FlowAccessors {
  imports: string[];
  backingField: string;
  publicField: string;
}

export const buildStateContainerAccessors = (
  stateContainer: StateContainerType,
  stateType: string,
): FlowAccessors => {
  if (stateContainer === 'LiveData') {
    return {
      imports: ['import androidx.lifecycle.LiveData', 'import androidx.lifecycle.MutableLiveData'],
      backingField: `private val _uiState = MutableLiveData(${stateType}())`,
      publicField: 'val uiState: LiveData<${stateType}> = _uiState'.replace('${stateType}', stateType),
    };
  }

  return {
    imports: ['import kotlinx.coroutines.flow.MutableStateFlow', 'import kotlinx.coroutines.flow.StateFlow'],
    backingField: `private val _uiState = MutableStateFlow(${stateType}())`,
    publicField: 'val uiState: StateFlow<${stateType}> = _uiState'.replace('${stateType}', stateType),
  };
};

export const stateUpdateExpression = (
  stateContainer: StateContainerType,
  expression: string,
): string => {
  if (stateContainer === 'LiveData') {
    return `_uiState.postValue(${expression})`;
  }

  return `_uiState.value = ${expression}`;
};
