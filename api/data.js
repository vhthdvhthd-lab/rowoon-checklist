import { put, get } from '@vercel/blob';

const FILES = {
  settings: 'rowoon-checklist-settings.json',
  checklists: 'rowoon-checklist-checklists.json',
};

async function readKey(key) {
  const pathname = FILES[key];
  if (!pathname) throw new Error('잘못된 저장 키입니다.');

  try {
    const blob = await get(pathname, {
      access: 'private',
      useCache: false,
    });

    if (!blob) return null;

    const text = await new Response(blob.stream).text();
    return JSON.parse(text);
  } catch (error) {
    if (
      error?.statusCode === 404 ||
      error?.status === 404 ||
      error?.code === 'BLOB_NOT_FOUND' ||
      String(error?.message || '').toLowerCase().includes('not found')
    ) {
      return null;
    }
    throw error;
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  try {
    if (req.method === 'GET') {
      const key = req.query?.key;

      if (!FILES[key]) {
        return res.status(400).json({
          error: 'key는 settings 또는 checklists여야 합니다.',
        });
      }

      const data = await readKey(key);
      return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
      const body = req.body || {};
      const key = body.key;
      const data = body.data;

      if (!FILES[key]) {
        return res.status(400).json({
          error: 'key는 settings 또는 checklists여야 합니다.',
        });
      }

      if (typeof data === 'undefined') {
        return res.status(400).json({
          error: '저장할 data가 없습니다.',
        });
      }

      await put(
        FILES[key],
        JSON.stringify(data),
        {
          access: 'private',
          allowOverwrite: true,
          addRandomSuffix: false,
          contentType: 'application/json; charset=utf-8',
          cacheControlMaxAge: 0,
        }
      );

      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({
      error: 'Method Not Allowed',
    });
  } catch (error) {
    console.error('Vercel Blob API error:', error);

    return res.status(500).json({
      error: '공용 저장소 처리 중 오류가 발생했습니다.',
      detail: String(error?.message || error),
    });
  }
}
