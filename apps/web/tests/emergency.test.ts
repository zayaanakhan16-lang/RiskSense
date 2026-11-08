import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EMERGENCY_DIRECTORY,
  emergencyCategoryForHazard,
  emergencyFor,
  recommendedNumber,
  type EmergencyEntry,
} from "@risksense/shared";

const byCode = (code: string): EmergencyEntry => {
  const entry = EMERGENCY_DIRECTORY.find((e) => e.code === code);
  assert.ok(entry, `directory should contain ${code}`);
  return entry;
};

test("hazard families map to the emergency category a person would dial for", () => {
  assert.equal(emergencyCategoryForHazard("wildfire"), "fire");
  assert.equal(emergencyCategoryForHazard("flood"), "flood");
  assert.equal(emergencyCategoryForHazard("earthquake"), "earthquake");
  assert.equal(emergencyCategoryForHazard("landslide"), "earthquake");
  assert.equal(emergencyCategoryForHazard("severe-weather"), "storm");
  assert.equal(emergencyCategoryForHazard("cyclone"), "storm");
  assert.equal(emergencyCategoryForHazard("industrial"), "industrial");
  assert.equal(emergencyCategoryForHazard("drought"), "other");
  assert.equal(emergencyCategoryForHazard("something-unmapped"), "other");
});

test("a wildfire area leads with the fire service, not the general line", () => {
  // France publishes a dedicated fire line (18); the pick must be that one.
  const fr = byCode("FR");
  const pick = recommendedNumber(fr, "fire");
  assert.ok(pick);
  assert.equal(pick.specific, true);
  assert.equal(pick.field, "fire");
  assert.equal(pick.value, "18");
  assert.notEqual(pick.value, fr.numbers.general);

  // Australia has no separate fire line, so a wildfire falls back to 000 and is
  // honestly labelled as the general line rather than dressed up as specific.
  const au = recommendedNumber(byCode("AU"), "fire");
  assert.ok(au);
  assert.equal(au.specific, false);
  assert.equal(au.value, "000");
});

test("a flood leads with the disaster relief line when the country has one", () => {
  const au = recommendedNumber(byCode("AU"), "flood");
  assert.ok(au);
  assert.equal(au.field, "relief");
  assert.equal(au.specific, true);

  const gb = recommendedNumber(byCode("GB"), "flood");
  assert.ok(gb);
  assert.equal(gb.field, "relief");
});

test("falls back to the general number, and says so, when nothing specific exists", () => {
  // Mexico publishes only a general emergency number, so a flood leads there.
  const mx = byCode("MX");
  assert.equal(mx.numbers.relief, undefined);
  const pick = recommendedNumber(mx, "flood");
  assert.ok(pick);
  assert.equal(pick.field, "general");
  assert.equal(pick.specific, false);
  assert.equal(pick.value, mx.numbers.general);
});

test("returns nothing, rather than guessing, when no route is verified", () => {
  // Japan lists police/fire/ambulance but no general or relief line, so a
  // flood has no verified route and the caller shows the unverified message.
  const jp = byCode("JP");
  assert.equal(recommendedNumber(jp, "flood"), null);
});

test("never invents a number for a country outside the directory", () => {
  assert.equal(recommendedNumber(undefined, "fire"), null);
  assert.equal(recommendedNumber(null, "flood"), null);
  assert.equal(emergencyFor("ZZ"), undefined);
});

test("every verified entry resolves to a usable number for fire and medical", () => {
  for (const entry of EMERGENCY_DIRECTORY) {
    if (!entry.verified) continue;
    assert.ok(
      Object.keys(entry.numbers).length > 0,
      `${entry.code} is verified but publishes no number`,
    );
    assert.ok(recommendedNumber(entry, "fire"), `${entry.code} has no fire route`);
    assert.ok(recommendedNumber(entry, "medical"), `${entry.code} has no medical route`);
  }
});

test("a country with no general line still routes fire and medical correctly", () => {
  // China publishes 110/119/120 rather than one general number.
  const cn = byCode("CN");
  assert.equal(cn.numbers.general, undefined);
  const fire = recommendedNumber(cn, "fire");
  assert.ok(fire);
  assert.equal(fire.value, "119");
  assert.equal(fire.specific, true);
});
