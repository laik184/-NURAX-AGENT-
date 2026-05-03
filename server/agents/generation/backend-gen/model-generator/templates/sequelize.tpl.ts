export function sequelizeTemplate(modelCode: string, modelName: string): string {
  return [
    "import { DataTypes, Model } from \"sequelize\";",
    "",
    `export class ${modelName} extends Model {}`,
    "",
    `${modelName}.init({`,
    modelCode,
    "}, { sequelize, modelName: \"" + modelName + "\" });",
  ].join("\n");
}
