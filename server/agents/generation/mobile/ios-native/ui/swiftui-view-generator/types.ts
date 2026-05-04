export type BindingConfig = {
  readonly name: string;
  readonly swiftType: string;
  readonly propertyWrapper: string;
  readonly defaultValue?: string;
};

export type LayoutType = "VStack" | "HStack" | "ZStack";

export type ComponentType = "text" | "button" | "card" | "textfield" | "image" | "spacer";

export type ListStyleType = "list" | "lazyVStack";

export type FormFieldType = "text" | "secure" | "email" | "toggle";

export type ComponentConfig = {
  readonly id: string;
  readonly type: ComponentType;
  readonly title?: string;
  readonly value?: string;
  readonly actionName?: string;
  readonly destination?: string;
  readonly systemImage?: string;
  readonly props?: Readonly<Record<string, unknown>>;
  readonly children?: readonly ComponentConfig[];
};

export type LayoutConfig = {
  readonly type: LayoutType;
  readonly spacing?: number;
  readonly alignment?: string;
};

export type NavigationConfig = {
  readonly title?: string;
  readonly enabled?: boolean;
  readonly useNavigationStack?: boolean;
  readonly useNavigationLinks?: boolean;
  readonly useNavigationLink?: boolean;
  readonly destinationView?: string;
};

export type ListConfig = {
  readonly enabled: boolean;
  readonly style?: ListStyleType;
  readonly itemBindingName?: string;
  readonly rowViewName?: string;
};

export type FormFieldConfig = {
  readonly id: string;
  readonly label: string;
  readonly type: FormFieldType;
  readonly binding: string;
  readonly placeholder?: string;
  readonly required?: boolean;
};

export type FormConfig = {
  readonly enabled: boolean;
  readonly fields: readonly FormFieldConfig[];
};

export type ScreenConfig = {
  readonly screenName: string;
  readonly layout: Readonly<LayoutConfig>;
  readonly components: readonly ComponentConfig[];
  readonly navigation?: Readonly<NavigationConfig>;
  readonly list?: Readonly<ListConfig>;
  readonly form?: Readonly<FormConfig>;
};

export type SwiftUIViewOutput = {
  readonly success: boolean;
  readonly code: string;
  readonly components: readonly string[];
  readonly logs: readonly string[];
  readonly error?: string;
};
