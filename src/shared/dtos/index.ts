// Barrel of all DTO classes. Each class has a `constructor(raw)` that copies
// fields from a raw API response, applying safe defaults so missing/null
// fields never crash consumer code. Nested DTOs are constructed recursively
// so the whole object tree is always a tree of class instances.
//
// Shapes derive from weborder.json (OpenAPI); now hand-maintained (no
// generator in this repo). Field types live as `declare` lines on each class.
export * from "./auth.dto";
export * from "./files.dto";
export * from "./insured.dto";
export * from "./payment.dto";
export * from "./questions.dto";
export * from "./rating.dto";
