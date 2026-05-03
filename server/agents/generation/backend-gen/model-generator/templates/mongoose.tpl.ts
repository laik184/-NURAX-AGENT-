export function mongooseTemplate(modelCode: string, modelName: string): string {
  return [
    "import { Schema, model } from \"mongoose\";",
    "",
    `const ${modelName}Schema = new Schema({`,
    modelCode,
    "});",
    "",
    `export const ${modelName}Model = model(\"${modelName}\", ${modelName}Schema);`,
  ].join("\n");
}
