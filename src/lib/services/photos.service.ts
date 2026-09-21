import { validatePhoto } from '../utils/photos.ts';
import crypto from 'crypto';

export type PhotoKind = 'before' | 'after' | 'other';
export const ALLOWED_KINDS: readonly PhotoKind[] = ['before', 'after', 'other'];

export function isValidKind(kind: any): kind is PhotoKind {
  return ALLOWED_KINDS.includes(kind);
}

export type UploadDeps = {
  supabase: any;
  file: File;
  clientId: string;
  kind: any;
};

export async function uploadClientPhotoService({ supabase, file, clientId, kind }: UploadDeps) {
  if (!file || !clientId) return { success: false, error: "Arquivo ou cliente ausentes." };
  if (clientId.startsWith("demo-")) return { success: false, error: "Não permitido para demonstração." };
  if (!isValidKind(kind)) return { success: false, error: "Categoria de foto inválida." };

  const validation = await validatePhoto(file);
  if (!validation.success) return validation;

  const { data: profile } = await supabase.from('profiles').select('organization_id').single();
  if (!profile?.organization_id) return { success: false, error: "Sessão inválida." };

  const { data: clientCheck } = await supabase.from('clients').select('id, organization_id').eq('id', clientId).single();
  if (!clientCheck || clientCheck.organization_id !== profile.organization_id) {
    return { success: false, error: "Cliente não encontrado ou acesso negado." };
  }

  const extension = validation.extension;
  const uuid = crypto.randomUUID();
  const storagePath = `${profile.organization_id}/${clientId}/${uuid}.${extension}`;

  const buffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from('client-photos')
    .upload(storagePath, buffer, { contentType: validation.mime, upsert: false });

  if (uploadError) return { success: false, error: "Falha ao enviar arquivo. Detalhe: " + uploadError.message };

  const { error: dbError } = await supabase
    .from('client_photos')
    .insert([{
      organization_id: profile.organization_id,
      client_id: clientId,
      kind,
      storage_path: storagePath
    }]);

  if (dbError) {
    const { error: rollbackError } = await supabase.storage.from('client-photos').remove([storagePath]);
    if (rollbackError) {
      return { success: false, error: "Falha ao registrar foto e falha ao reverter arquivo físico.", partialFailure: true };
    }
    return { success: false, error: "Falha ao registrar foto. Arquivo revertido com segurança." };
  }

  return { success: true };
}

export async function deleteClientPhotoService(supabase: any, photoId: string) {
  if (photoId.startsWith("mock-")) return { success: true };
  
  const { data: profile } = await supabase.from('profiles').select('organization_id').single();
  if (!profile?.organization_id) return { success: false, error: "Sessão inválida." };

  const { data: photo } = await supabase
    .from('client_photos')
    .select('id, storage_path, organization_id')
    .eq('id', photoId)
    .single();

  if (!photo) return { success: true };

  if (photo.organization_id !== profile.organization_id) {
    return { success: false, error: "Acesso negado." };
  }

  let storageRemoved = false;
  if (!photo.storage_path.startsWith('data:image/')) {
    const { data: removed, error: storageError } = await supabase.storage
      .from('client-photos')
      .remove([photo.storage_path]);
      
    if (storageError && !storageError.message?.toLowerCase().includes('not found')) {
      return { success: false, error: "Falha ao remover arquivo do armazenamento." };
    }
    storageRemoved = true;
  }

  const { error } = await supabase.from('client_photos').delete().eq('id', photoId);
  
  if (error) {
    if (storageRemoved) {
      return { success: false, error: "Falha ao remover registro do banco de dados (arquivo físico removido).", partialFailure: true };
    }
    return { success: false, error: "Falha ao remover registro do banco de dados." };
  }
  
  return { success: true };
}

export async function generateSignedUrlsService(supabase: any, dbPhotos: any[]) {
  const photos = [];
  const maxConcurrency = 3;
  for (let i = 0; i < dbPhotos.length; i += maxConcurrency) {
    const batch = dbPhotos.slice(i, i + maxConcurrency);
    const promises = batch.map(async (photo: any) => {
      let url = null;
      if (photo.storage_path.startsWith('data:image/')) {
        url = photo.storage_path;
      } else {
        try {
          const { data: signedData, error } = await supabase.storage
            .from('client-photos')
            .createSignedUrl(photo.storage_path, 3600);
          if (!error && signedData) {
            url = signedData.signedUrl;
          }
        } catch (err) {}
      }
      return { id: photo.id, kind: photo.kind, created_at: photo.created_at, url };
    });
    
    const resolvedBatch = await Promise.all(promises);
    photos.push(...resolvedBatch);
  }
  return photos;
}
