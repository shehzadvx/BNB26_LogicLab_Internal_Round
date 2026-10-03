// Mock data in the EXACT shapes from CONTEXT.md. Do not change shapes here
// without updating CONTEXT.md and telling the team.

export const MOCK_DURATION = 187.4

export function buildMockAnalysis(videoId, scale = 1) {
  const t = (n) => Math.round(n * scale * 10) / 10

  const sections = [
    { id: 's1', text: 'Most creators burn out because their workflow is broken, not because they are lazy.', startSec: t(0), endSec: t(62) },
    { id: 's2', text: 'A good system turns one long recording into many short pieces of content.', startSec: t(62), endSec: t(125) },
    { id: 's3', text: 'Start small: one script, one video, three clips, and publish consistently.', startSec: t(125), endSec: t(187.4) },
  ]

  const clips = [
    {
      id: `${videoId}_c1`, videoId, title: 'Why most creators burn out',
      startSec: t(12), endSec: t(41.5),
      hook: "You're not lazy. Your workflow is broken.",
      caption: 'Burnout is a systems problem, not a motivation problem.',
      hashtags: ['#creator', '#workflow', '#burnout'],
      sectionId: 's1', reason: 'Strongest emotional moment, matches script paragraph 1', edited: false,
    },
    {
      id: `${videoId}_c2`, videoId, title: 'One recording, many clips',
      startSec: t(70), endSec: t(105),
      hook: 'Stop recording ten videos. Record one.',
      caption: 'Turn a single long video into a week of content.',
      hashtags: ['#contentcreator', '#repurposing', '#shorts'],
      sectionId: 's2', reason: 'Clear, actionable tip that matches script paragraph 2', edited: false,
    },
    {
      id: `${videoId}_c3`, videoId, title: 'Start small',
      startSec: t(130), endSec: t(168),
      hook: 'Three clips. One video. Start today.',
      caption: 'Consistency beats perfection, start with one script and one video.',
      hashtags: ['#creatortips', '#consistency', '#startnow'],
      sectionId: 's3', reason: 'Strong call to action, matches script paragraph 3', edited: false,
    },
  ]

  return { sections, clips }
}

export function mockHookVariants(tone = 'bold') {
  const sets = {
    bold: ['Your workflow is the problem, not you.', 'Quit blaming yourself. Fix the system.', 'Burnout is a bug. Here is the patch.'],
    curious: ['What if burnout is not about effort at all?', 'The real reason creators quit (it is not what you think).', 'Why do the best creators still burn out?'],
    friendly: ["Hey, it's not your fault. Let's fix your workflow.", "If you're tired, you're not alone. Try this.", 'A gentle reminder: the system is the problem.'],
  }
  return { hooks: sets[tone] || sets.bold }
}

const PLATFORM_RULES = {
  reels:    { aspectRatio: '9:16', maxDurationSec: 90,  tag: '#reels',    notes: 'Keep text short, add captions on screen' },
  shorts:   { aspectRatio: '9:16', maxDurationSec: 60,  tag: '#shorts',   notes: 'Hook in the first 2 seconds, loop-friendly ending' },
  linkedin: { aspectRatio: '4:5',  maxDurationSec: 180, tag: '#linkedin', notes: 'More professional tone, lead with the insight' },
}

export function mockAdapt(clip, platform) {
  const rule = PLATFORM_RULES[platform]
  if (!rule) throw new Error('Unknown platform: ' + platform)
  const duration = clip.endSec - clip.startSec
  const tooLong = duration > rule.maxDurationSec
  return {
    clipId: clip.id,
    platform,
    aspectRatio: rule.aspectRatio,
    maxDurationSec: rule.maxDurationSec,
    hook: platform === 'linkedin' ? `Insight: ${clip.hook}` : clip.hook,
    caption: platform === 'linkedin' ? `${clip.caption} What is your take?` : clip.caption,
    hashtags: [...clip.hashtags.slice(0, 2), rule.tag],
    notes: tooLong ? `Clip is ${duration.toFixed(0)}s, over the ${rule.maxDurationSec}s limit. ${rule.notes}` : rule.notes,
  }
}