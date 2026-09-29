import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { markMessageSentService } from '../src/lib/services/automations.service.ts';
import { createClientRecordService, updateClientRecordService } from '../src/lib/services/clients.service.ts';

test('Fase 4 - Migration 0004: Verificação Estática de save_client_with_anamnesis e Rejeição de Pagamento Negativo', () => {
  const migrationPath = path.join(process.cwd(), 'supabase/migrations/202609290004_anamnesis_and_negative_payment.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Check save_client_with_anamnesis RPC definition
  assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.save_client_with_anamnesis'), 'RPC save_client_with_anamnesis deve existir');
  assert.ok(sql.includes('SET search_path = \'\''), 'RPC deve ter search_path = \'\'');
  assert.ok(sql.includes('SECURITY DEFINER'), 'RPC deve ser SECURITY DEFINER');
  assert.ok(sql.includes('IF p_has_anamnesis THEN'), 'Deve atualizar anamnese somente se p_has_anamnesis for verdadeiro');

  // Check finish_appointment_checkout_full update
  assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.finish_appointment_checkout_full'), 'RPC finish_appointment_checkout_full deve existir');
  assert.ok(sql.includes('Payment amount cannot be negative'), 'Deve rejeitar pagamento com valor negativo');
  assert.ok(sql.includes('FOR UPDATE'), 'Deve manter SELECT ... FOR UPDATE');
});

test('Fase 4 - Automações: markMessageSentService real com mock Supabase (insert, duplicate e erro)', async () => {
  // Mock 1: First insert (success)
  let insertedData: any = null;
  const mockSupabaseSuccess: any = {
    from: (table: string) => {
      if (table === 'profiles') {
        return { select: () => ({ single: async () => ({ data: { organization_id: 'org-1' } }) }) };
      }
      if (table === 'message_jobs') {
        return {
          select: () => ({
            eq: (col1: string, val1: any) => ({
              eq: (col2: string, val2: any) => ({
                eq: (col3: string, val3: any) => ({
                  eq: async () => ({ data: [] })
                }),
                then: (cb: any) => cb({ data: [] })
              })
            })
          }),
          insert: async (rows: any[]) => {
            insertedData = rows[0];
            return { error: null };
          }
        };
      }
      return {};
    }
  };

  const res1 = await markMessageSentService(mockSupabaseSuccess, 'client-10', 'reminders', 'appt-20');
  assert.strictEqual(res1.success, true);
  assert.strictEqual(insertedData.organization_id, 'org-1');
  assert.strictEqual(insertedData.client_id, 'client-10');
  assert.strictEqual(insertedData.appointment_id, 'appt-20');
  assert.strictEqual(insertedData.payload.list, 'reminders');

  // Mock 2: Duplicate check (returns duplicate without inserting)
  let insertCalled = false;
  const mockSupabaseDuplicate: any = {
    from: (table: string) => {
      if (table === 'profiles') {
        return { select: () => ({ single: async () => ({ data: { organization_id: 'org-1' } }) }) };
      }
      if (table === 'message_jobs') {
        return {
          select: () => ({
            eq: (col1: string, val1: any) => ({
              eq: (col2: string, val2: any) => ({
                eq: (col3: string, val3: any) => ({
                  eq: async () => ({ data: [{ id: 'job-1', payload: { list: 'reminders' } }] })
                }),
                then: (cb: any) => cb({ data: [{ id: 'job-1', payload: { list: 'reminders' } }] })
              })
            })
          }),
          insert: async () => {
            insertCalled = true;
            return { error: null };
          }
        };
      }
      return {};
    }
  };

  const res2 = await markMessageSentService(mockSupabaseDuplicate, 'client-10', 'reminders', 'appt-20');
  assert.strictEqual(res2.success, true);
  assert.strictEqual((res2 as any).duplicate, true);
  assert.strictEqual(insertCalled, false);

  // Mock 3: DB Insert Error
  const mockSupabaseError: any = {
    from: (table: string) => {
      if (table === 'profiles') {
        return { select: () => ({ single: async () => ({ data: { organization_id: 'org-1' } }) }) };
      }
      if (table === 'message_jobs') {
        return {
          select: () => ({
            eq: (col1: string, val1: any) => ({
              eq: (col2: string, val2: any) => ({
                eq: (col3: string, val3: any) => ({
                  eq: async () => ({ data: [] })
                }),
                then: (cb: any) => cb({ data: [] })
              })
            })
          }),
          insert: async () => ({ error: { message: 'DB Insert Failed' } })
        };
      }
      return {};
    }
  };

  const res3 = await markMessageSentService(mockSupabaseError, 'client-10', 'reminders', 'appt-20');
  assert.strictEqual(res3.success, false);
  assert.strictEqual(res3.error, 'DB Insert Failed');
});

test('Fase 4 - Automações: job legado sem payload.list não bloqueia o envio de reminders ou overdue', async () => {
  let insertCalled = false;
  let insertedData: any = null;

  const mockSupabaseLegacyJob: any = {
    from: (table: string) => {
      if (table === 'profiles') {
        return { select: () => ({ single: async () => ({ data: { organization_id: 'org-1' } }) }) };
      }
      if (table === 'message_jobs') {
        return {
          select: () => ({
            eq: (col1: string, val1: any) => ({
              eq: (col2: string, val2: any) => ({
                eq: (col3: string, val3: any) => ({
                  eq: async () => ({ data: [{ id: 'legacy-job-1', payload: {} }] })
                }),
                then: (cb: any) => cb({ data: [{ id: 'legacy-job-1', payload: {} }] })
              })
            })
          }),
          insert: async (rows: any[]) => {
            insertCalled = true;
            insertedData = rows[0];
            return { error: null };
          }
        };
      }
      return {};
    }
  };

  const res = await markMessageSentService(mockSupabaseLegacyJob, 'client-10', 'reminders', 'appt-20');
  assert.strictEqual(res.success, true);
  assert.strictEqual((res as any).duplicate, undefined);
  assert.strictEqual(insertCalled, true);
  assert.strictEqual(insertedData.payload.list, 'reminders');
});

test('Fase 4 - Clientes: createClientRecordService e updateClientRecordService reais com payload RPC verificado', async () => {
  let rpcName: string = '';
  let rpcParams: any = null;

  const mockSupabaseRpc: any = {
    rpc: async (name: string, params: any) => {
      rpcName = name;
      rpcParams = params;
      return { data: 'client-999', error: null };
    }
  };

  const clientWithAnamnesis = {
    name: 'Maria Silva',
    phone: '(11) 99999-8888',
    notes: JSON.stringify({
      text: 'Observação livre',
      anamnesis: { diabetes: true, gestante: false, roeUnha: true, alergias: 'Látex' }
    })
  };

  const createRes = await createClientRecordService(mockSupabaseRpc, clientWithAnamnesis);
  assert.strictEqual(createRes.success, true);
  assert.strictEqual(rpcName, 'save_client_with_anamnesis');
  assert.strictEqual(rpcParams.p_client_id, null);
  assert.strictEqual(rpcParams.p_name, 'Maria Silva');
  assert.strictEqual(rpcParams.p_notes, 'Observação livre');
  assert.strictEqual(rpcParams.p_has_anamnesis, true);
  assert.strictEqual(rpcParams.p_diabetes, true);
  assert.strictEqual(rpcParams.p_nail_biting, true);
  assert.strictEqual(rpcParams.p_allergies, 'Látex');

  // Test Update Client WITHOUT Anamnesis (p_has_anamnesis MUST be false to avoid erasing existing anamnesis)
  const clientWithoutAnamnesis = {
    name: 'Maria Silva Editada',
    phone: '(11) 99999-8888',
    notes: 'Apenas nota de texto'
  };

  const updateRes = await updateClientRecordService(mockSupabaseRpc, 'client-999', clientWithoutAnamnesis);
  assert.strictEqual(updateRes.success, true);
  assert.strictEqual(rpcParams.p_client_id, 'client-999');
  assert.strictEqual(rpcParams.p_notes, 'Apenas nota de texto');
  assert.strictEqual(rpcParams.p_has_anamnesis, false);
});
