import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fetchPublicBookingData, getOrgBySlug, fetchPublicBookingDataBySlug } from "../src/lib/services/public-booking.service.ts";

test("fetchPublicBookingData & Multi-Tenant Slug Tests", async (t) => {
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

  await t.test("Migration 0005: Static check for slug column and default gabi-ludwig", () => {
    const migrationPath = path.join(process.cwd(), "supabase/migrations/202609290005_organization_slug_default.sql");
    const sql = fs.readFileSync(migrationPath, "utf8");

    assert.ok(sql.includes("ADD COLUMN IF NOT EXISTS slug TEXT"), "Migration deve adicionar coluna slug");
    assert.ok(sql.includes("SET slug = 'gabi-ludwig'"), "Migration deve atualizar slug padrão para gabi-ludwig");
    assert.ok(sql.includes("organizations_slug_key UNIQUE (slug)"), "Migration deve incluir constraint UNIQUE em slug");
  });

  await t.test("getOrgBySlug returns org for valid slug and null for invalid slug", async () => {
    const mockDb: any = {
      orgs: [
        { id: "org-1", name: "Gabi Ludwig Nails", slug: "gabi-ludwig" },
        { id: "org-2", name: "Studio Beauty", slug: "studio-beauty" }
      ]
    };

    const supabaseMock: any = {
      from: (table: string) => ({
        select: () => ({
          eq: (col: string, val: string) => ({
            maybeSingle: async () => {
              if (table === "organizations" && col === "slug") {
                const found = mockDb.orgs.find((o: any) => o.slug === val);
                return { data: found || null, error: null };
              }
              return { data: null, error: null };
            }
          })
        })
      })
    };

    const org1 = await getOrgBySlug(supabaseMock, "gabi-ludwig");
    assert.ok(org1);
    assert.strictEqual(org1.id, "org-1");
    assert.strictEqual(org1.name, "Gabi Ludwig Nails");

    const org2 = await getOrgBySlug(supabaseMock, "STUDIO-BEAUTY ");
    assert.ok(org2);
    assert.strictEqual(org2.id, "org-2");

    const orgNotFound = await getOrgBySlug(supabaseMock, "invalido");
    assert.strictEqual(orgNotFound, null);
  });

  await t.test("fetchPublicBookingDataBySlug enforces multi-tenant isolation", async () => {
    const dbOrgA = {
      org: { id: "org-a", name: "Org A", slug: "org-a" },
      professionals: [{ id: "p-a", name: "Prof A", specialties: ["Nails"] }],
      services: [{ id: "s-a", name: "Serv A", category: "Cat A", duration_minutes: 30, price: 100 }]
    };
    const dbOrgB = {
      org: { id: "org-b", name: "Org B", slug: "org-b" },
      professionals: [{ id: "p-b", name: "Prof B", specialties: ["Lashes"] }],
      services: [{ id: "s-b", name: "Serv B", category: "Cat B", duration_minutes: 45, price: 150 }]
    };

    const supabaseMock: any = {
      from: (table: string) => ({
        select: () => ({
          eq: (col1: string, val1: string) => {
            if (table === "organizations" && col1 === "slug") {
              return {
                maybeSingle: async () => {
                  if (val1 === "org-a") return { data: dbOrgA.org, error: null };
                  if (val1 === "org-b") return { data: dbOrgB.org, error: null };
                  return { data: null, error: null };
                }
              };
            }
            const orgId = val1;
            return {
              eq: (_col2: string, _val2: any) => ({
                order: async () => {
                  if (table === "professionals") {
                    const data = orgId === "org-a" ? dbOrgA.professionals : dbOrgB.professionals;
                    return { data, error: null };
                  }
                  if (table === "services") {
                    const data = orgId === "org-a" ? dbOrgA.services : dbOrgB.services;
                    return { data, error: null };
                  }
                  return { data: [], error: null };
                }
              })
            };
          }
        })
      })
    };

    const resultA = await fetchPublicBookingDataBySlug(supabaseMock, "org-a");
    assert.strictEqual(resultA.success, true);
    assert.strictEqual(resultA.orgName, "Org A");
    assert.strictEqual(resultA.professionals[0].name, "Prof A");
    assert.strictEqual(resultA.services[0].name, "Serv A");

    const resultB = await fetchPublicBookingDataBySlug(supabaseMock, "org-b");
    assert.strictEqual(resultB.success, true);
    assert.strictEqual(resultB.orgName, "Org B");
    assert.strictEqual(resultB.professionals[0].name, "Prof B");
    assert.strictEqual(resultB.services[0].name, "Serv B");

    // Ensure Org A cannot see Org B's data
    assert.ok(!resultA.professionals.some((p: any) => p.name === "Prof B"));
    assert.ok(!resultA.services.some((s: any) => s.name === "Serv B"));
  });

  await t.test("availability-engine.ts static check for orgId filtering", () => {
    const enginePath = path.join(process.cwd(), "src/lib/availability-engine.ts");
    const code = fs.readFileSync(enginePath, "utf8");

    assert.ok(code.includes('.eq("organization_id", orgId)'), "Motor de disponibilidade deve filtrar por organization_id");
    assert.ok(code.includes('if (!orgId) throw new Error("Organização não informada")'), "Motor de disponibilidade deve exigir orgId");
  });
});
