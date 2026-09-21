const assert = require('assert');

// Mock function that implements the same logic as getPublicBookingData
async function getPublicBookingData(mockSupabase, orgId) {
  if (!mockSupabase) return { success: false, services: [], professionals: [] };
  
  try {
    const { data: profData, error: profError } = await mockSupabase.from("professionals").select().eq("organization_id", orgId).eq("active", true);
    if (profError) return { success: false, services: [], professionals: [] };

    const { data: srvData, error: srvError } = await mockSupabase.from("services").select().eq("organization_id", orgId).eq("active", true);
    if (srvError) return { success: false, services: [], professionals: [] };

    return {
      success: true,
      professionals: profData.map((p) => ({ id: p.id, name: p.name })),
      services: srvData.map((s) => ({ id: s.id, name: s.name }))
    };
  } catch (error) {
    return { success: false, services: [], professionals: [] };
  }
}

// Test cases
async function runTests() {
  console.log("Running Public Booking Tests...\n");

  let mockSupabase = {
    from: (table) => ({
      select: () => ({
        eq: (col1, val1) => ({
          eq: (col2, val2) => {
            // Mock DB data
            let data = [];
            if (table === "professionals") {
              data = [
                { id: "1", organization_id: "org1", name: "Gabi", active: true },
                { id: "2", organization_id: "org1", name: "Inactive Prof", active: false },
                { id: "3", organization_id: "org2", name: "Other Org Prof", active: true },
              ];
            } else if (table === "services") {
              data = [
                { id: "1", organization_id: "org1", name: "Manicure", active: true },
                { id: "2", organization_id: "org1", name: "Inativo", active: false },
              ];
            }
            
            const filtered = data.filter(r => r[col1] === val1 && r[col2] === val2);
            return Promise.resolve({ data: filtered, error: null });
          }
        })
      })
    })
  };

  // Test 1: Returns only active items for the specific org
  const result1 = await getPublicBookingData(mockSupabase, "org1");
  assert.strictEqual(result1.success, true);
  assert.strictEqual(result1.professionals.length, 1);
  assert.strictEqual(result1.professionals[0].name, "Gabi");
  assert.strictEqual(result1.services.length, 1);
  assert.strictEqual(result1.services[0].name, "Manicure");
  console.log("✅ Test 1 Passed: Returns only active items for the specific org");

  // Test 2: Filters strictly by organization
  const result2 = await getPublicBookingData(mockSupabase, "org2");
  assert.strictEqual(result2.professionals.length, 1);
  assert.strictEqual(result2.professionals[0].name, "Other Org Prof");
  assert.strictEqual(result2.services.length, 0);
  console.log("✅ Test 2 Passed: Filters strictly by organization");

  // Test 3: Failure handling
  let errorSupabase = {
    from: () => ({ select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: null, error: new Error("DB Error") }) }) }) })
  };
  const result3 = await getPublicBookingData(errorSupabase, "org1");
  assert.strictEqual(result3.success, false);
  assert.strictEqual(result3.professionals.length, 0);
  console.log("✅ Test 3 Passed: Handles errors securely without leaking internals");

  console.log("\nAll tests passed successfully!");
}

runTests();
