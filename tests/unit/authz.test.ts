import { describe, expect, it } from "vitest";
import { resolveRole, roleAtLeast } from "@/lib/authz";

const owner = { id: "u-owner", isAdmin: false };
const admin = { id: "u-admin", isAdmin: true };
const someone = { id: "u-x", isAdmin: false };
const open = { ownerId: owner.id, access: "OPEN" as const };
const restricted = { ownerId: owner.id, access: "RESTRICTED" as const };

describe("resolveRole", () => {
  it("global admin is ADMIN everywhere", () => {
    expect(resolveRole(admin, restricted, null)).toBe("ADMIN");
  });
  it("owner is ADMIN of their project even with a lower membership", () => {
    expect(resolveRole(owner, restricted, "VIEWER")).toBe("ADMIN");
  });
  it("membership role wins over open default", () => {
    expect(resolveRole(someone, open, "EDITOR")).toBe("EDITOR");
  });
  it("open project grants VIEWER to anyone", () => {
    expect(resolveRole(someone, open, null)).toBe("VIEWER");
  });
  it("restricted project grants nothing without membership", () => {
    expect(resolveRole(someone, restricted, null)).toBeNull();
  });
  it("restricted project grants the membership role", () => {
    expect(resolveRole(someone, restricted, "VIEWER")).toBe("VIEWER");
  });
});

describe("roleAtLeast", () => {
  it("orders VIEWER < EDITOR < ADMIN", () => {
    expect(roleAtLeast("ADMIN", "EDITOR")).toBe(true);
    expect(roleAtLeast("EDITOR", "EDITOR")).toBe(true);
    expect(roleAtLeast("VIEWER", "EDITOR")).toBe(false);
    expect(roleAtLeast(null, "VIEWER")).toBe(false);
  });
});
