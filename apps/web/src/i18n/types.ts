/** Dictionary leaves are strings; `he` must have exactly the same shape as `en` (enforced by TypeScript). */
export type DeepString<T> = { [K in keyof T]: T[K] extends string ? string : DeepString<T[K]> };
export type Leaves<T, P extends string = ""> = { [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`> }[keyof T & string];
/** Keys with plural forms are written as `base_one` / `base_two` / `base_other`; pass `base` to `tp()`. */
export type PluralBase<L extends string> = L extends `${infer B}_other` ? B : never;
