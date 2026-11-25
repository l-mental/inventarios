export async function downloadLaravelZip(): Promise<void> {
  const response = await fetch('/downloads/agropartes-laravel.zip', {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error('No se pudo descargar el paquete Laravel (.zip).');
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'agropartes-laravel.zip';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
