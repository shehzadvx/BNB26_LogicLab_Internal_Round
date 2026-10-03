import { Router } from 'express';
import { getClip, updateClip, getVideo, listVideos } from '../store.js';

const router = Router();
const STATUSES = ['idea', 'scripted', 'edited', 'ready', 'scheduled'];
const PLATFORMS = ['reels', 'shorts', 'linkedin'];

// PATCH /api/clips/:id/status  { status, scheduledAt?, platform? }
router.patch('/clips/:id/status', (req, res) => {
  const clip = getClip(req.params.id);
  if (!clip) return res.status(404).json({ error: 'Clip not found' });

  const { status, scheduledAt, platform } = req.body || {};
  if (!STATUSES.includes(status))
    return res.status(400).json({ error: `status must be one of: ${STATUSES.join(', ')}` });

  const changes = { status, scheduledAt: null, scheduledPlatform: null };
  if (status === 'scheduled') {
    const t = Date.parse(scheduledAt);
    if (!scheduledAt || Number.isNaN(t))
      return res.status(400).json({ error: 'scheduledAt must be a valid date-time' });
    if (!PLATFORMS.includes(platform))
      return res.status(400).json({ error: `platform must be one of: ${PLATFORMS.join(', ')}` });
    changes.scheduledAt = new Date(t).toISOString();
    changes.scheduledPlatform = platform;
  }
  res.json(updateClip(clip.id, changes, { markEdited: false }));
});

// GET /api/schedule  -> queue of scheduled clips, soonest first
router.get('/schedule', (_req, res) => {
  const items = [];
  for (const v of listVideos()) {
    for (const c of v.clips || []) {
      if (c.status === 'scheduled' && c.scheduledAt) {
        items.push({
          clipId: c.id, videoId: v.id, filename: v.filename, title: c.title,
          platform: c.scheduledPlatform, scheduledAt: c.scheduledAt,
          published: false, // nothing is ever published
        });
      }
    }
  }
  items.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  res.json({ items, note: 'Planning only. Real publishing is future scope.' });
});

// POST /api/clips/:id/export  { platform? } -> ready-to-paste post text
router.post('/clips/:id/export', (req, res) => {
  const clip = getClip(req.params.id);
  if (!clip) return res.status(404).json({ error: 'Clip not found' });
  const platform = req.body?.platform;
  if (platform && !PLATFORMS.includes(platform))
    return res.status(400).json({ error: 'Unknown platform' });

  const video = getVideo(clip.videoId);
  const caption = clip.caption || '';
  const extra = (clip.hashtags || []).filter(h => !caption.toLowerCase().includes(h.toLowerCase()));
  const text = [clip.hook, '', caption, ...(extra.length ? ['', extra.join(' ')] : [])].join('\n');  
  res.json({
    clipId: clip.id,
    platform: platform || null,
    text,
    videoFile: video?.filename || null,
    trim: { startSec: clip.startSec, endSec: clip.endSec },
    filename: `${clip.id}${platform ? '_' + platform : ''}.txt`,
  });
});

export default router;