// Vercel Serverless Function
// Shared storage for Rowoon checklist.
// Requires a Vercel Blob store connected to this project.

import { put, get } from '@vercel/blob';

const FILE_NAME = 'rowoon-checklist-shared.json';

async function readShared() {
  try {
    const result = await get(FILE_NAME, { access: 'private', useCache: false });
    if (!result) return { data: {} };

    const text = await new Response(result.stream).text();
    return JSON.parse(text || '{"data":{}}');
  } catch (e) {
    return { data: {} };
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'GET') {
    try {
      const data = await readShared();
      return res.status(200).json(data);
    } catch (e) {
      return res.status(500).json({
        error: '공용 데이터를 불러오지 못했습니다.',
        detail: String(e)
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      if (!body.data || typeof body.data !== 'object') {
        return res.status(400).json({ error: '잘못된 데이터입니다.' });
      }

      const current = await readShared();
      const merged = {
        data: {
          ...(current.data || {}),
          ...(body.data || {})
        }
      };

      await put(FILE_NAME, JSON.stringify(merged), {
        access: 'private',
        addRandomSuffix: false,
        contentType: 'application/json',
        cacheControlMaxAge: 0
      });

      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({
        error: '공용 저장에 실패했습니다.',
        detail: String(e)
      });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
