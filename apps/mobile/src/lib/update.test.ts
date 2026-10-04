import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({ Platform: { OS: "android" }, Linking: { openURL: vi.fn() } }));
vi.mock("expo-constants", () => ({ default: { expoConfig: { android: { versionCode: 5 } } } }));

import { apkUrlFor, compareBuilds, parseBuildTag } from "./update";

describe("updater", () => {
  it("parses build tags strictly", () => {
    expect(parseBuildTag("apk-12")).toBe(12);
    expect(parseBuildTag(" apk-3 ")).toBe(3);
    for (const bad of ["v1.2", "apk-", "apk-1x", "apk--1", "", null, 7, undefined]) expect(parseBuildTag(bad)).toBeNull();
  });
  it("detects a newer release only", () => {
    expect(compareBuilds(5, { tag_name: "apk-6" }, "o/r")?.available).toBe(true);
    expect(compareBuilds(5, { tag_name: "apk-5" }, "o/r")?.available).toBe(false);
    expect(compareBuilds(5, { tag_name: "apk-4" }, "o/r")?.available).toBe(false);
    expect(compareBuilds(5, { tag_name: "latest" }, "o/r")).toBeNull();
    expect(compareBuilds(5, null, "o/r")).toBeNull();
  });
  it("builds the stable download URL", () => {
    expect(apkUrlFor("o/r")).toBe("https://github.com/o/r/releases/latest/download/EAR.apk");
  });
});
