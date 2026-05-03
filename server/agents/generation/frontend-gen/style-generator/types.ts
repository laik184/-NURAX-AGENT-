export type ThemeMode = "light" | "dark";
export type BreakpointName = "mobile" | "tablet" | "desktop";

export interface StyleGeneratorInput {
  readonly viewportWidth: number;
  readonly themeMode?: ThemeMode;
  readonly prefersReducedMotion?: boolean;
  readonly highContrast?: boolean;
  readonly baseFontPx?: number;
}

export interface Breakpoints {
  readonly mobile: number;
  readonly tablet: number;
  readonly desktop: number;
}

export interface LayoutSystem {
  readonly containerMaxWidth: string;
  readonly columns: number;
  readonly gutter: string;
  readonly display: "flex" | "grid";
}

export interface TypographySystem {
  readonly fontFamily: string;
  readonly scale: Readonly<Record<string, string>>;
  readonly lineHeight: Readonly<Record<string, number>>;
}

export interface SpacingSystem {
  readonly scale: Readonly<Record<string, string>>;
}

export interface ColorSystem {
  readonly primary: string;
  readonly secondary: string;
  readonly success: string;
  readonly warning: string;
  readonly danger: string;
  readonly background: string;
  readonly surface: string;
  readonly text: string;
}

export interface ThemeSystem {
  readonly mode: ThemeMode;
  readonly tokens: Readonly<Record<string, string>>;
}

export interface AccessibilitySystem {
  readonly minContrastRatio: number;
  readonly readability: "AA" | "AAA";
  readonly focusRing: string;
}

export interface AnimationSystem {
  readonly durationFast: string;
  readonly durationNormal: string;
  readonly easingStandard: string;
  readonly enabled: boolean;
}

export interface StyleRuntimeState {
  readonly activeThemeMode: ThemeMode;
  readonly activeBreakpoint: BreakpointName;
}

export interface ResponsiveStyleSystem {
  readonly breakpoints: Breakpoints;
  readonly layout: LayoutSystem;
  readonly typography: TypographySystem;
  readonly spacing: SpacingSystem;
  readonly colors: ColorSystem;
  readonly theme: ThemeSystem;
  readonly accessibility: AccessibilitySystem;
  readonly responsive: Readonly<Record<string, Readonly<Record<string, string>>>>;
  readonly animation: AnimationSystem;
  readonly stylesheet: string;
  readonly state: StyleRuntimeState;
}

export interface StyleGeneratorResult {
  readonly success: true;
  readonly logs: readonly string[];
  readonly data: ResponsiveStyleSystem;
}
