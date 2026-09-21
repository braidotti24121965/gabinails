import test from "node:test";
import assert from "node:assert";
import { getSupabasePublicUrl } from "../src/lib/utils/image.ts";

test("getSupabasePublicUrl tests", async (t) => {
  const originalEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://sibfrwzhsvkhtshakoaf.supabase.co";

  await t.test("Returns placeholder for empty paths", () => {
    assert.strictEqual(getSupabasePublicUrl(null), "/placeholder-image.png");
    assert.strictEqual(getSupabasePublicUrl(""), "/placeholder-image.png");
  });

  await t.test("Returns valid Supabase URL directly", () => {
    const validUrl = "https://sibfrwzhsvkhtshakoaf.supabase.co/storage/v1/object/public/photos/test.jpg";
    assert.strictEqual(getSupabasePublicUrl(validUrl), validUrl);
  });

  await t.test("Rejects non-Supabase URLs", () => {
    assert.strictEqual(getSupabasePublicUrl("https://evil.com/image.jpg"), "/placeholder-image.png");
  });

  await t.test("Transforms internal paths correctly", () => {
    assert.strictEqual(
      getSupabasePublicUrl("test-folder/image.jpg"), 
      "https://sibfrwzhsvkhtshakoaf.supabase.co/storage/v1/object/public/photos/test-folder/image.jpg"
    );
    assert.strictEqual(
      getSupabasePublicUrl("/test-folder/image.jpg"), 
      "https://sibfrwzhsvkhtshakoaf.supabase.co/storage/v1/object/public/photos/test-folder/image.jpg"
    );
  });

  // Cleanup correctly handling undefined vs string
  if (originalEnv === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv;
  }
});
