import { buildKotlinFileTemplate } from '../utils/kotlin-template.util.js';
import { buildStateContainerAccessors } from '../utils/flow.util.js';

interface ViewModelBuilderInput {
  packageName: string;
  viewModelName: string;
  stateName: string;
  intentName: string;
  repositoryFieldName: string;
  repositoryTypeName: string;
  dispatcherName: string;
  stateContainer: 'StateFlow' | 'LiveData';
  stateCode: string;
  intentCode: string;
  repositoryCode: string;
  coroutineHandlersCode: string;
}

export const buildViewModelAgent = (input: ViewModelBuilderInput): string => {
  const accessors = buildStateContainerAccessors(input.stateContainer, input.stateName);

  return buildKotlinFileTemplate({
    packageName: input.packageName,
    imports: [
      'import androidx.lifecycle.ViewModel',
      'import androidx.lifecycle.viewModelScope',
      'import kotlinx.coroutines.CoroutineDispatcher',
      'import kotlinx.coroutines.Dispatchers',
      'import kotlinx.coroutines.launch',
      ...accessors.imports,
    ],
    body: `
${input.stateCode}

${input.intentCode}

class ${input.viewModelName}(
    private val ${input.repositoryFieldName}: ${input.repositoryTypeName},
    private val dispatcher: CoroutineDispatcher = ${input.dispatcherName},
) : ViewModel() {
    private typealias State = ${input.stateName}
    private typealias Intent = ${input.intentName}

    ${accessors.backingField}
    ${accessors.publicField}

    ${input.repositoryCode}

    ${input.coroutineHandlersCode}
}
`,
  });
};
