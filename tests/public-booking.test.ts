import test from "node:test";
import assert from "node:assert";
import { fetchPublicBookingData } from "../src/lib/services/public-booking.service.ts";

test("fetchPublicBookingData tests", async (t) => {
  const mockSupabase = (profData: any, profError: any, srvData: any, srvError: any) => ({
    from: (table: any) => ({
      select: () => ({
        eq: (col: any, val: any) => ({
          eq: () => ({
            order: () => {
              if (table === "professionals") return Promise.resolve({ data: profData, error: profError });
              if (table === "services") return Promise.resolve({ data: srvData, error: srvError });
            }
          })
        })
      })
    })
  }) as any;

  await t.test("error when GABI_ORG_ID is missing", async () => {
    const result = await fetchPublicBookingData({} as any, null);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, "Missing configuration");
  });

  await t.test("error on professionals query", async () => {
    const sb = mockSupabase(null, new Error("DB error"), null, null);
    const result = await fetchPublicBookingData(sb, "org1");
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, "Database error");
  });

  await t.test("error on services query", async () => {
    const sb = mockSupabase([], null, null, new Error("DB error"));
    const result = await fetchPublicBookingData(sb, "org1");
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, "Database error");
  });

  await t.test("empty catalogue", async () => {
    const sb = mockSupabase([], null, [], null);
    const result = await fetchPublicBookingData(sb, "org1");
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.professionals.length, 0);
    assert.strictEqual(result.services.length, 0);
  });

  await t.test("success with valid data, no administrative data exposed", async () => {
    const profs = [{ id: "1", name: "Gabi", specialties: ["Nails"], email: "admin@gabi.com", commission: 50 }];
    const srvs = [{ id: "2", name: "Manicure", category: "Hands", duration_minutes: 60, price: 50, secret_cost: 10 }];

    const sb = mockSupabase(profs, null, srvs, null);
    const result = await fetchPublicBookingData(sb, "org1");

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.professionals.length, 1);
    assert.strictEqual((result.professionals[0] as any).email, undefined);
    assert.strictEqual(result.services.length, 1);
    assert.strictEqual((result.services[0] as any).secret_cost, undefined);
  });
});
