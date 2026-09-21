export async function validatePhoto(file: File) {
  if (!file || file.size === 0) {
    return { success: false, error: "Arquivo vazio ou inválido." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "O tamanho do arquivo não pode exceder 5 MB." };
  }

  // Magic bytes check
  const buffer = await file.arrayBuffer();
  const arr = new Uint8Array(buffer).subarray(0, 12);
  let magicMime = null;
  let extension = null;

  // JPEG: FF D8 FF
  if (arr[0] === 0xFF && arr[1] === 0xD8 && arr[2] === 0xFF) {
    magicMime = 'image/jpeg';
    extension = 'jpeg';
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  else if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47 && 
           arr[4] === 0x0D && arr[5] === 0x0A && arr[6] === 0x1A && arr[7] === 0x0A) {
    magicMime = 'image/png';
    extension = 'png';
  }
  // WebP: RIFF ... WEBP
  else if (arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46 &&
           arr[8] === 0x57 && arr[9] === 0x45 && arr[10] === 0x42 && arr[11] === 0x50) {
    magicMime = 'image/webp';
    extension = 'webp';
  }

  if (!magicMime) {
    return { success: false, error: "Formato de arquivo não suportado ou inválido." };
  }
  
  if (file.type && file.type !== magicMime) {
    return { success: false, error: "Tipo de arquivo declarado não corresponde ao conteúdo real." };
  }

  return { success: true, mime: magicMime, extension };
}
