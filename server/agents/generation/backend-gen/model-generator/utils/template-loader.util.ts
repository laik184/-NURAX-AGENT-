import type { SupportedOrm } from "../types.js";
import { prismaTemplate } from "../templates/prisma.tpl.js";
import { mongooseTemplate } from "../templates/mongoose.tpl.js";
import { sequelizeTemplate } from "../templates/sequelize.tpl.js";
import { typeormTemplate } from "../templates/typeorm.tpl.js";

export type TemplateRenderer = (modelCode: string, modelName: string) => string;

const TEMPLATE_REGISTRY: Record<SupportedOrm, TemplateRenderer> = {
  prisma: prismaTemplate,
  mongoose: mongooseTemplate,
  sequelize: sequelizeTemplate,
  typeorm: typeormTemplate,
};

export function loadTemplate(orm: SupportedOrm): TemplateRenderer {
  return TEMPLATE_REGISTRY[orm];
}
