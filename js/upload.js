/**
 * upload.js — Preparazione dei documenti da salvare dentro Firestore.
 *
 * Firebase Storage richiede il piano a pagamento, quindi i certificati medici
 * vengono salvati come stringhe base64 dentro Firestore. Il vincolo che governa
 * tutto: **un documento Firestore non può superare 1 MiB**, e la codifica
 * base64 gonfia i byte di circa un terzo.
 *
 *   700 KB di file  →  ~933 KB di base64  →  entra, con margine
 *   800 KB di file  →  ~1,07 MB           →  documento rifiutato
 *
 * Da qui i due comportamenti diversi:
 *   - le immagini vengono ridimensionate e ricompresse (una foto da telefono
 *     passa da 4 MB a poche centinaia di KB senza diventare illeggibile)
 *   - i PDF non si possono comprimere nel browser: se sono troppo grandi
 *     l'unica risposta onesta è dirlo e suggerire di fotografare il documento
 */

/** Limite del file finale, scelto per stare sotto 1 MiB una volta in base64. */
export const MAX_BYTES = 700 * 1024;

/** Lato lungo massimo dopo il ridimensionamento. Un A4 a 1600px resta leggibile. */
const MAX_EDGE = 1600;

export const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export function humanSize(bytes) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

/** File → data URL, via FileReader. */
function readAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Lettura del file non riuscita.'));
    reader.readAsDataURL(blob);
  });
}

/** data URL → { contentType, base64 } */
export function splitDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error('Formato del file non riconosciuto.');
  return { contentType: match[1], base64: match[2] };
}

/** { contentType, base64 } → data URL, per mostrare il documento. */
export function toDataUrl(contentType, base64) {
  return `data:${contentType};base64,${base64}`;
}

/**
 * Ridimensiona e ricomprime un'immagine finché non sta nel limite.
 * Riduce prima la qualità, poi le dimensioni: sfocare è meglio che rimpicciolire
 * un documento che deve restare leggibile.
 */
async function compressImage(file) {
  const bitmap = await createImageBitmap(file);

  let scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  let quality = 0.82;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
    if (!blob) throw new Error('Compressione non riuscita.');
    if (blob.size <= MAX_BYTES) return blob;

    if (quality > 0.5) quality -= 0.12;
    else scale *= 0.8;
  }

  throw new Error('Immagine troppo grande anche dopo la compressione. Riprova con una foto più piccola.');
}

/**
 * Prepara un file per il salvataggio.
 * @param {File} file
 * @returns {Promise<{fileName, contentType, size, base64}>}
 */
export async function prepareDocument(file) {
  if (!file) throw new Error('Nessun file selezionato.');

  const isImage = file.type.startsWith('image/');
  if (!isImage && file.type !== 'application/pdf') {
    throw new Error('Formati accettati: foto (JPG, PNG, WEBP) oppure PDF.');
  }

  if (!isImage && file.size > MAX_BYTES) {
    throw new Error(
      `Il PDF pesa ${humanSize(file.size)}, il massimo è ${humanSize(MAX_BYTES)}. ` +
        'Comprimilo, oppure fotografa il certificato: le foto vengono ridotte in automatico.'
    );
  }

  const blob = isImage ? await compressImage(file) : file;
  const { contentType, base64 } = splitDataUrl(await readAsDataUrl(blob));

  // Controllo finale sulla stringa vera, non sulla stima: è quella che finisce
  // nel documento ed è quella che le Security Rules misurano.
  if (base64.length > 960000) {
    throw new Error('Documento troppo grande per essere salvato. Riprova con un file più leggero.');
  }

  return {
    fileName: file.name.slice(0, 160),
    contentType,
    size: blob.size,
    base64,
  };
}
