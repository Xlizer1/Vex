import { expect, test } from "bun:test";
import { formatSquad, parseSquad, rankLabel, rolesToPing } from "./lfg";

test("pings the chosen tier and its neighbours", () => {
  expect(rolesToPing("premier:3")).toEqual(["10,000–14,999", "15,000–19,999", "20,000–24,999"]);
  expect(rolesToPing("faceit:6")).toEqual(["FACEIT Level 6", "FACEIT Level 7", "FACEIT Level 8"]);
});

test("clamps at the ends of the ladder", () => {
  expect(rolesToPing("premier:0")).toEqual(["1,000–4,999", "5,000–9,999"]);
  expect(rolesToPing("faceit:9")).toEqual(["FACEIT Level 9", "FACEIT Level 10"]);
});

test("bad input pings nobody", () => {
  for (const bad of ["", "premier:99", "premier:-1", "valorant:1", "faceit:x"]) expect(rolesToPing(bad)).toEqual([]);
});

test("squad round-trips through the card text", () => {
  const text = formatSquad(["111", "222"], 5);
  expect(parseSquad(text)).toEqual(["111", "222"]);
  expect(text.split("\n")).toHaveLength(5);
  expect(parseSquad(undefined)).toEqual([]);
});

test("labels", () => {
  expect(rankLabel("premier:6")).toBe("Premier 30,000+");
  expect(rankLabel("nope")).toBeUndefined();
});
