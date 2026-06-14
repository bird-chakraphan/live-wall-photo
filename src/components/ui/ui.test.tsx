import { describe, expect, it } from "vitest";
import { acToSolid, gradientText } from "./index";

describe("acToSolid", () => {
  it("falls back to the default coral when no accent is given", () => {
    expect(acToSolid()).toBe("#FF7A59");
    expect(acToSolid(null)).toBe("#FF7A59");
  });

  it("returns solid hex colors unchanged", () => {
    expect(acToSolid("#112233")).toBe("#112233");
  });

  it("extracts the first hex color from a gradient", () => {
    expect(acToSolid("linear-gradient(135deg, #5CC9A7, #93DA8D)")).toBe("#5CC9A7");
  });

  it("falls back to the default coral when a gradient has no hex color", () => {
    expect(acToSolid("linear-gradient(135deg, red, blue)")).toBe("#FF7A59");
  });
});

describe("gradientText", () => {
  it("returns a plain color style for solid accents", () => {
    expect(gradientText("#112233")).toEqual({ color: "#112233" });
  });

  it("falls back to the default coral when no accent is given", () => {
    expect(gradientText()).toEqual({ color: "#FF7A59" });
    expect(gradientText(null)).toEqual({ color: "#FF7A59" });
  });

  it("returns a clipped background-image style for gradient accents", () => {
    const style = gradientText("linear-gradient(135deg, #5CC9A7, #93DA8D)");
    expect(style.backgroundImage).toBe("linear-gradient(135deg, #5CC9A7, #93DA8D)");
    expect(style.WebkitBackgroundClip).toBe("text");
    expect(style.backgroundClip).toBe("text");
    expect(style.color).toBe("");
  });
});
