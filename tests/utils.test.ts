import assert from "node:assert/strict";
import test from "node:test";

import { cn } from "../src/lib/utils";

test("merges tailwind classes and keeps the last conflicting utility", () => {
  assert.equal(cn("px-2", undefined, "text-sm", "px-4"), "text-sm px-4");
});
