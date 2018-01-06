import { flatten, humanizeDollar } from "../src/util";
import assert = require("assert");

describe("util", () => {
  it("flatten", () => {
    assert.deepEqual(flatten([[1,2,4],333, [5,4,6]]) , [1, 2, 4, 333, 5, 4, 6]);
  });

  it("humanizeDollar", () => {
    assert(humanizeDollar(10000) === "$10,000.00");
  });
});
