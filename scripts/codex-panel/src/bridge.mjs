// Only user-initiated UI controls call this bridge. Preparing a prompt never starts a turn.
export const draftMessage = prompt => ({
  role: 'user', content: [{ type: 'text', text: prompt }],
  _meta: { 'openai/message': { target: 'new', send: false } },
});

export const openIssueDraft = async ({ prompt, extensions }) => {
  if (!extensions.message) return { drafted: false, reason: 'Хост не поддерживает новый черновик. Скопируйте запрос и откройте новый чат.' };
  const result = await extensions.message.send(draftMessage(prompt));
  if (result?.isError) throw new Error('Codex не открыл черновик. Скопируйте подготовленный запрос.');
  return { drafted: true };
};

export const safeGithubUrl = (url, repository) => {
  try {
    const parsed = new URL(url);
    const [owner, repo] = repository.split('/');
    return parsed.protocol === 'https:' && parsed.hostname === 'github.com' && !parsed.username && !parsed.password &&
      new RegExp(`^/${owner.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/${repo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/(?:issues|pull)/\\d+$`).test(parsed.pathname)
      ? parsed.href : null;
  } catch { return null; }
};
