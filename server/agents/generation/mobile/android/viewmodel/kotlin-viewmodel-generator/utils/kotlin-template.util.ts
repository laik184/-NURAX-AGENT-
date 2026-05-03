interface KotlinTemplateInput {
  packageName: string;
  imports: string[];
  body: string;
}

export const buildKotlinFileTemplate = ({ packageName, imports, body }: KotlinTemplateInput): string => {
  const uniqueImports = Array.from(new Set(imports)).sort();

  return [
    `package ${packageName}`,
    '',
    ...uniqueImports,
    '',
    body.trim(),
    '',
  ].join('\n');
};
