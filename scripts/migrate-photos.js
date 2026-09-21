/**
 * Script para migrar fotos em base64 da tabela client_photos para o Supabase Storage.
 * Uso: 
 * node scripts/migrate-photos.js --dry-run
 * node scripts/migrate-photos.js --execute --batch-size 10 --start-id "some-uuid"
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');

function parseArgs(args = process.argv.slice(2)) {
  const isDryRun = args.includes('--dry-run');
  const isExecute = args.includes('--execute');
  
  let batchSize = 10;
  const batchIdx = args.indexOf('--batch-size');
  if (batchIdx >= 0 && args[batchIdx + 1]) {
    batchSize = parseInt(args[batchIdx + 1], 10);
  }

  let startId = '00000000-0000-0000-0000-000000000000';
  const startIdx = args.indexOf('--start-id');
  if (startIdx >= 0 && args[startIdx + 1]) {
    startId = args[startIdx + 1];
  }

  if (isDryRun && isExecute) {
    throw new Error("Conflito: --dry-run e --execute usados simultaneamente.");
  }
  if (!isDryRun && !isExecute) {
    throw new Error("Necessário especificar --dry-run ou --execute.");
  }
  if (isNaN(batchSize) || batchSize < 1 || batchSize > 100) {
    throw new Error("Lote inválido. Deve ser entre 1 e 100.");
  }

  return { isDryRun, isExecute, batchSize, startId };
}

function validateBinaryMime(buffer) {
  const arr = new Uint8Array(buffer).subarray(0, 12);
  if (arr[0] === 0xFF && arr[1] === 0xD8 && arr[2] === 0xFF) return { mime: 'image/jpeg', ext: 'jpeg' };
  if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47 && 
      arr[4] === 0x0D && arr[5] === 0x0A && arr[6] === 0x1A && arr[7] === 0x0A) return { mime: 'image/png', ext: 'png' };
  if (arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46 &&
      arr[8] === 0x57 && arr[9] === 0x45 && arr[10] === 0x42 && arr[11] === 0x50) return { mime: 'image/webp', ext: 'webp' };
  return null;
}

async function run() {
  try {
    const { isDryRun, isExecute, batchSize, startId } = parseArgs();
    
    if (!fs.existsSync('.env.local')) {
      console.error("[ERRO] .env.local ausente.");
      process.exitCode = 1;
      return;
    }
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
      const [k, ...v] = line.split('=');
      if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/['"]/g, '');
    });

    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[ERRO] Variáveis do Supabase ausentes.");
      process.exitCode = 1;
      return;
    }

    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    let lastId = startId;
    let processed = 0;
    let migrated = 0;
    let ignored = 0;
    let failed = 0;
    let rollbackFailures = 0;
    
    console.log(`[INFO] Iniciando ${isDryRun ? 'DRY-RUN' : 'EXECUTE'} (Lote: ${batchSize}) a partir de ${startId}`);

    while (true) {
      const { data: photos, error: fetchError } = await supabase
        .from('client_photos')
        .select('id, organization_id, client_id, storage_path')
        .gt('id', lastId)
        .order('id', { ascending: true })
        .limit(batchSize);

      if (fetchError) {
        console.error(`[ERRO] Falha ao buscar lote: ${fetchError.message}`);
        process.exitCode = 1;
        break;
      }

      if (!photos || photos.length === 0) break;

      for (const photo of photos) {
        processed++;
        lastId = photo.id;

        if (!photo.storage_path.startsWith('data:image/')) {
          ignored++;
          continue;
        }

        const match = photo.storage_path.match(/^data:(image\/\w+);base64,(.+)$/);
        if (!match) {
          console.error(`[FALHA] ID ${photo.id}: formato base64 desconhecido.`);
          failed++;
          continue;
        }

        const buffer = Buffer.from(match[2], 'base64');
        if (buffer.length > 5 * 1024 * 1024) {
          console.error(`[FALHA] ID ${photo.id}: excede 5MB.`);
          failed++;
          continue;
        }

        const signature = validateBinaryMime(buffer);
        if (!signature) {
          console.error(`[FALHA] ID ${photo.id}: assinatura binária inválida.`);
          failed++;
          continue;
        }

        const uuid = crypto.randomUUID();
        const newStoragePath = `${photo.organization_id}/${photo.client_id}/${uuid}.${signature.ext}`;

        if (isDryRun) {
          console.log(`[DRY-RUN] ID ${photo.id} elegível para migração.`);
          migrated++;
          continue;
        }

        // Execute mode
        const { error: uploadError } = await supabase.storage
          .from('client-photos')
          .upload(newStoragePath, buffer, { contentType: signature.mime, upsert: false });
          
        if (uploadError) {
          console.error(`[FALHA] ID ${photo.id}: upload storage falhou.`);
          failed++;
          continue;
        }

        const { error: updateError } = await supabase
          .from('client_photos')
          .update({ storage_path: newStoragePath })
          .eq('id', photo.id);
          
        if (updateError) {
          console.error(`[FALHA] ID ${photo.id}: erro BD, revertendo storage...`);
          const { error: rollbackError } = await supabase.storage.from('client-photos').remove([newStoragePath]);
          if (rollbackError) {
             console.error(`[FALHA-CRITICA] ID ${photo.id}: falha no rollback.`);
             rollbackFailures++;
          }
          failed++;
        } else {
          console.log(`[SUCESSO] ID ${photo.id} migrado.`);
          migrated++;
        }
      }
    }

    console.log("\n=== RESUMO ===");
    console.log(`Processados: ${processed}`);
    console.log(`Ignorados: ${ignored}`);
    console.log(`Migrados: ${migrated}`);
    console.log(`Falhas: ${failed}`);
    if (rollbackFailures > 0) console.log(`Falhas Críticas de Rollback: ${rollbackFailures}`);

    if (failed > 0 || rollbackFailures > 0) process.exitCode = 1;
  } catch (err) {
    console.error(`[ERRO FATAL] ${err.message}`);
    process.exitCode = 1;
  }
}

module.exports = { parseArgs, validateBinaryMime, run };

if (require.main === module) {
  run();
}
