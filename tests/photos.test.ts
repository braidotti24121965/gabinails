import { test } from 'node:test';
import assert from 'node:assert';
import { uploadClientPhotoService, deleteClientPhotoService, generateSignedUrlsService, isValidKind } from '../src/lib/services/photos.service.ts';
import { validatePhoto } from '../src/lib/utils/photos.ts';

test('isValidKind works correctly', () => {
  assert.strictEqual(isValidKind('before'), true);
  assert.strictEqual(isValidKind('after'), true);
  assert.strictEqual(isValidKind('other'), true);
  assert.strictEqual(isValidKind('invalid'), false);
  assert.strictEqual(isValidKind(null), false);
});

// validatePhoto tests
test('validatePhoto - rejects empty file', async () => {
  const emptyFile = new File([], 'empty.png', { type: 'image/png' });
  const emptyRes = await validatePhoto(emptyFile);
  assert.strictEqual(emptyRes.success, false);
  assert.match(emptyRes.error || '', /Arquivo vazio/);
});

test('validatePhoto - rejects >5MB file', async () => {
  // 5MB + 1 byte
  const largeBuffer = new Uint8Array(5 * 1024 * 1024 + 1);
  const largeFile = new File([largeBuffer], 'large.jpg', { type: 'image/jpeg' });
  const largeRes = await validatePhoto(largeFile);
  assert.strictEqual(largeRes.success, false);
  assert.match(largeRes.error || '', /O tamanho do arquivo/);
});

test('validatePhoto - rejects spoofed MIME (declared png but text bytes)', async () => {
  const spoofedFile = new File(['just some text data'], 'spoofed.png', { type: 'image/png' });
  const spoofedRes = await validatePhoto(spoofedFile);
  assert.strictEqual(spoofedRes.success, false);
  assert.match(spoofedRes.error || '', /Formato de arquivo não/);
});

test('validatePhoto - accepts valid JPEG', async () => {
  const file = new File([new Uint8Array([0xFF, 0xD8, 0xFF, 0x00])], 'test.jpg', { type: 'image/jpeg' });
  const res = await validatePhoto(file);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.extension, 'jpeg');
});

test('validatePhoto - accepts valid PNG', async () => {
  const pngMagicBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const file = new File([pngMagicBytes], 'test.png', { type: 'image/png' });
  const res = await validatePhoto(file);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.extension, 'png');
});

test('validatePhoto - accepts valid WebP', async () => {
  const webpBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
  const file = new File([webpBytes], 'test.webp', { type: 'image/webp' });
  const res = await validatePhoto(file);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.extension, 'webp');
});

// Mock factory
function createMockSupabase(cfg: any = {}) {
  return {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => {
            if (table === 'clients') return cfg.clientCheck || { data: { id: 'c1', organization_id: 'org1' } };
            if (table === 'client_photos') return cfg.photoCheck || { data: { id: 'p1', organization_id: 'org1', storage_path: 'org1/c1/uuid.jpg' } };
            return { data: null };
          }
        }),
        single: async () => {
          if (table === 'profiles') return cfg.profile || { data: { organization_id: 'org1' } };
          return { data: null };
        }
      }),
      insert: async () => cfg.dbInsert || { error: null },
      delete: () => ({
        eq: async () => cfg.dbDelete || { error: null }
      })
    }),
    storage: {
      from: () => ({
        upload: async () => cfg.storageUpload || { error: null },
        remove: async () => cfg.storageRemove || { data: [{}], error: null },
        createSignedUrl: async (path: string) => {
          if (cfg.createSignedUrl) return cfg.createSignedUrl(path);
          return { data: { signedUrl: 'http://signed' }, error: null };
        }
      })
    }
  };
}

const fakeJpg = new File([new Uint8Array([0xFF, 0xD8, 0xFF])], 'test.jpg', { type: 'image/jpeg' });

test('uploadClientPhotoService - success', async () => {
  const supabase = createMockSupabase();
  const res = await uploadClientPhotoService({ supabase, file: fakeJpg, clientId: 'c1', kind: 'other' });
  assert.strictEqual(res.success, true);
});

test('uploadClientPhotoService - missing session', async () => {
  const supabase = createMockSupabase({ profile: { data: null } });
  const res = await uploadClientPhotoService({ supabase, file: fakeJpg, clientId: 'c1', kind: 'other' });
  assert.strictEqual(res.success, false);
});

test('uploadClientPhotoService - cross organization rejection', async () => {
  const supabase = createMockSupabase({ clientCheck: { data: { id: 'c1', organization_id: 'org2' } } });
  const res = await uploadClientPhotoService({ supabase, file: fakeJpg, clientId: 'c1', kind: 'other' });
  assert.strictEqual(res.success, false);
});

test('uploadClientPhotoService - db failure triggers rollback', async () => {
  const supabase = createMockSupabase({ dbInsert: { error: { message: 'db error' } } });
  const res = await uploadClientPhotoService({ supabase, file: fakeJpg, clientId: 'c1', kind: 'other' });
  assert.strictEqual(res.success, false);
  assert.match(res.error || '', /Arquivo revertido/);
});

test('uploadClientPhotoService - rollback failure returns partialFailure', async () => {
  const supabase = createMockSupabase({ 
    dbInsert: { error: { message: 'db error' } },
    storageRemove: { error: { message: 'storage error' } }
  });
  const res = await uploadClientPhotoService({ supabase, file: fakeJpg, clientId: 'c1', kind: 'other' });
  assert.strictEqual(res.success, false);
  assert.strictEqual((res as any).partialFailure, true);
});

test('deleteClientPhotoService - cross organization rejection', async () => {
  let dbDeleteCalled = false;
  let storageRemoveCalled = false;
  const supabase = createMockSupabase({
    photoCheck: { data: { id: 'p1', organization_id: 'org2', storage_path: 'org2/c1/uuid.jpg' } },
    storageRemove: async () => { storageRemoveCalled = true; return { data: [{}], error: null }; }
  });
  supabase.from = (table) => {
    if (table === 'profiles') return { select: () => ({ single: async () => ({ data: { organization_id: 'org1' } }) }) };
    if (table === 'client_photos') return {
      select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p1', organization_id: 'org2', storage_path: 'org2/c1/uuid.jpg' } }) }) }),
      delete: () => ({ eq: async () => { dbDeleteCalled = true; return { error: null }; } })
    };
    return {} as any;
  };

  const res = await deleteClientPhotoService(supabase, 'p1');
  assert.strictEqual(res.success, false);
  assert.match(res.error || '', /Acesso negado/);
  assert.strictEqual(dbDeleteCalled, false);
  assert.strictEqual(storageRemoveCalled, false);
});

test('deleteClientPhotoService - idempotent success if not found in db', async () => {
  const supabase = createMockSupabase({ photoCheck: { data: null } });
  const res = await deleteClientPhotoService(supabase, 'p1');
  assert.strictEqual(res.success, true);
});

test('deleteClientPhotoService - legacy data:image string deletes db only', async () => {
  const supabase = createMockSupabase({ photoCheck: { data: { id: 'p1', organization_id: 'org1', storage_path: 'data:image/png;base64,abc' } } });
  const res = await deleteClientPhotoService(supabase, 'p1');
  assert.strictEqual(res.success, true);
});

test('deleteClientPhotoService - missing in storage treats as success', async () => {
  const supabase = createMockSupabase({ storageRemove: { error: { message: 'not found' } } });
  const res = await deleteClientPhotoService(supabase, 'p1');
  assert.strictEqual(res.success, true);
});

test('deleteClientPhotoService - real storage error skips db delete', async () => {
  let deleteCalled = false;
  const supabase = createMockSupabase({ storageRemove: { error: { message: 'timeout' } } });
  supabase.from = (table) => {
    if (table === 'profiles') return { select: () => ({ single: async () => ({ data: { organization_id: 'org1' } }) }) };
    if (table === 'client_photos') return {
      select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'p1', organization_id: 'org1', storage_path: 'org1/c1/uuid.jpg' } }) }) }),
      delete: () => ({ eq: async () => { deleteCalled = true; return { error: null }; } })
    };
    return {} as any;
  };
  const res = await deleteClientPhotoService(supabase, 'p1');
  assert.strictEqual(res.success, false);
  assert.strictEqual(deleteCalled, false);
});

test('deleteClientPhotoService - db delete fails after storage success returns partialFailure', async () => {
  const supabase = createMockSupabase({ dbDelete: { error: { message: 'db error' } } });
  const res = await deleteClientPhotoService(supabase, 'p1');
  assert.strictEqual(res.success, false);
  assert.strictEqual((res as any).partialFailure, true);
});

test('generateSignedUrlsService - limits concurrency and fallback', async () => {
  let activeCalls = 0;
  let maxActiveCalls = 0;

  const supabase = createMockSupabase({
    createSignedUrl: async (path: string) => {
      activeCalls++;
      if (activeCalls > maxActiveCalls) maxActiveCalls = activeCalls;
      
      // Delay to force concurrency window to overlap
      await new Promise(resolve => setTimeout(resolve, 10));
      
      activeCalls--;
      
      if (path === 'error_path') return { error: { message: 'fail' } };
      return { data: { signedUrl: `http://${path}` }, error: null };
    }
  });

  const dbPhotos = [
    { id: '1', kind: 'other', storage_path: 'data:image/png;base64,123' }, // legacy skip
    { id: '2', kind: 'before', storage_path: 'path_2' },
    { id: '3', kind: 'after', storage_path: 'error_path' }, // fails
    { id: '4', kind: 'before', storage_path: 'path_4' },
    { id: '5', kind: 'after', storage_path: 'path_5' },
    { id: '6', kind: 'before', storage_path: 'path_6' },
    { id: '7', kind: 'after', storage_path: 'path_7' },
    { id: '8', kind: 'other', storage_path: 'path_8' }
  ];

  const res = await generateSignedUrlsService(supabase, dbPhotos);
  
  // 1 is skipped (no delay), others take 10ms. Concurrency limit is 3.
  assert.strictEqual(res.length, 8);
  assert.ok(maxActiveCalls <= 3, `Max active calls should be <= 3, got ${maxActiveCalls}`);
  // With 7 async calls, max concurrency should definitely hit exactly 3
  assert.strictEqual(maxActiveCalls, 3);
  
  // Checking results and order
  assert.strictEqual(res[0].id, '1');
  assert.strictEqual(res[0].url, 'data:image/png;base64,123'); // legacy preserved
  
  assert.strictEqual(res[1].id, '2');
  assert.strictEqual(res[1].url, 'http://path_2'); // ok
  
  assert.strictEqual(res[2].id, '3');
  assert.strictEqual(res[2].url, null); // failed individually but others kept going
  
  assert.strictEqual(res[3].id, '4');
  assert.strictEqual(res[3].url, 'http://path_4'); // ok
  
  assert.strictEqual(res[7].id, '8');
  assert.strictEqual(res[7].url, 'http://path_8'); // order is fully preserved
});
