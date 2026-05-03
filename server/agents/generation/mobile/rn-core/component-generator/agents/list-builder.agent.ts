import { buildComponentTemplate } from "../utils/component-template.util.js";

export function buildListComponent(props: Readonly<Record<string, unknown>>): string {
  const data = props.data ?? [{ id: "1", title: "Item 1" }];
  const variant = typeof props.variant === "string" ? props.variant : "flat";

  if (variant === "section") {
    const sectionProps = {
      ...props,
      sections: props.sections ?? [{ title: "Section", data: ["Item"] }],
      stickySectionHeadersEnabled: props.stickySectionHeadersEnabled ?? true,
      keyExtractor: props.keyExtractor ?? "(item, index) => `${item}-${index}`",
      renderItem: props.renderItem ?? "({ item }) => <Text>{item}</Text>",
      renderSectionHeader: props.renderSectionHeader ?? "({ section }) => <Text>{section.title}</Text>",
    };

    return buildComponentTemplate("SectionList", sectionProps);
  }

  const flatProps = {
    ...props,
    data,
    initialNumToRender: props.initialNumToRender ?? 10,
    maxToRenderPerBatch: props.maxToRenderPerBatch ?? 10,
    windowSize: props.windowSize ?? 5,
    keyExtractor: props.keyExtractor ?? "(item) => String(item.id)",
    renderItem: props.renderItem ?? "({ item }) => <Text>{item.title}</Text>",
  };

  return buildComponentTemplate("FlatList", flatProps);
}
