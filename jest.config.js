module.exports = {
  roots: ["<rootDir>/test"],
  transform: {
    "^.+\\.ts?$": "ts-jest"
  },
  testRegex: "(.*|(\\.|/)(test|spec))\\.ts?$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"]
};
