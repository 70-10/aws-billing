import { flatten, humanizeDollar } from "../src/util";

describe("util", () => {
  it("flatten", () => {
    expect(flatten([[1, 2, 4], 333, [5, 4, 6]])).toEqual([1, 2, 4, 333, 5, 4, 6]);
  });

  it("humanizeDollar", () => {
    expect(humanizeDollar(10000)).toBe("$10,000.00");
  });
});
