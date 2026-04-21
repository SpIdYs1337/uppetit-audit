import imageCompression from 'browser-image-compression';

/**
 * Сжимает фото и загружает его напрямую в S3.
 * Возвращает публичную ссылку на загруженный файл.
 */
export async function uploadAuditPhoto(file: File): Promise<string | null> {
  try {
    // 1. СЖАТИЕ ФОТО
    const options = {
      maxSizeMB: 1,           // Жмем максимум до 1 МБ (для баз данных и трафика это идеально)
      maxWidthOrHeight: 1600, // Максимальная длина стороны 1600px
      useWebWorker: true,     // Чтобы интерфейс не зависал во время сжатия
    };
    
    console.log(`Исходный размер: ${(file.size / 1024 / 1024).toFixed(2)} МБ`);
    const compressedFile = await imageCompression(file, options);
    console.log(`Сжатый размер: ${(compressedFile.size / 1024 / 1024).toFixed(2)} МБ`);

    // 2. ПОЛУЧАЕМ ВРЕМЕННУЮ ССЫЛКУ ОТ НАШЕГО БЭКЕНДА
    const urlRes = await fetch('/api/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: compressedFile.name || 'photo.jpg',
        contentType: compressedFile.type || 'image/jpeg',
      }),
    });

    if (!urlRes.ok) throw new Error('Не удалось получить ссылку для загрузки');
    
    const { uploadUrl, publicUrl } = await urlRes.json();

    // 3. ОТПРАВЛЯЕМ ФАЙЛ НАПРЯМУЮ В ХРАНИЛИЩЕ BEGET
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': compressedFile.type,
      },
      body: compressedFile, 
    });

    if (!uploadRes.ok) throw new Error('Ошибка при отправке файла в хранилище Beget');

    // 4. ВОЗВРАЩАЕМ ГОТОВУЮ ССЫЛКУ ДЛЯ БАЗЫ ДАННЫХ
    return publicUrl;
    
  } catch (error) {
    console.error("Ошибка процесса загрузки фото:", error);
    return null;
  }
}