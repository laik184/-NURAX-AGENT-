import { buildComponentTemplate } from "../utils/component-template.util.js";

export function buildViewComponent(props: Readonly<Record<string, unknown>>): string {
  const useSafeArea = props.variant === "safe-area";
  const useScroll = props.variant === "scroll";

  if (useSafeArea) {
    return buildComponentTemplate("SafeAreaView", props, "\n  {/* content */}\n");
  }

  if (useScroll) {
    return buildComponentTemplate("ScrollView", props, "\n  {/* scrollable content */}\n");
  }

  return buildComponentTemplate("View", props, "\n  {/* content */}\n");
}
