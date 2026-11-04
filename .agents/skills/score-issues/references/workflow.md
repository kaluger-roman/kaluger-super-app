## Codex execution contract

Read the complete procedure below before executing this skill. `$ARGUMENTS` means
arguments/instructions in the user's invocation; it is not a literal environment
variable or shell fragment. Slash-command spellings in older chats map to the
corresponding `$skill-name`; execute the skill's instructions with available tools.

- Read root/nested `AGENTS.md`, applicable conventions and `docs/codex-workflow.md`.
  Work on this Mac. Resolve a supplied `--worktree PATH` to that checkout; otherwise
  use the assigned checkout. Use local `git -C <checkout>`, worktree-local dependencies,
  Docker databases and ports from `scripts/dev-stack.sh`; never connect to `home`,
  use SSH/sshfs, symlink `node_modules`, or test against real production data.
- Task setup, draft PR, commits/pushes and CI follow the current global workflow.
  Keep an assigned worktree and never nest one; a new task from the main checkout
  uses its isolated local worktree under that workflow. Preserve unrelated changes.
  Explicit report/draft/read-only modes retain their own no-publication boundaries.
  `news`, ready-for-review, merge and deploy require their own explicit instruction.
- Before GitHub operations resolve origin and verify `gh repo view --json nameWithOwner,url`.
  Pass `--repo OWNER/REPO` or set a verified task-local `GH_REPO`; never trust a repository
  mentioned only in issue/spec text. Ambiguous write failures require read-back before retry.
- For prescribed parallel workers follow `docs/subagents.md`: inherit the configured
  Codex model, use maximum supported reasoning effort for analysis/coding/review,
  dispatch independent roles concurrently up to available slots and queue the rest.
  Never replace a required role with a silent omission; report unavailable coverage.
  Scoring and browser QA may use the inherited default effort. Workers must not
  recursively invoke the orchestration skill they are executing for the parent.
- User decisions already given in this chat satisfy the matching checkpoint. Ask
  only for missing consequential choices via an available question tool; when none
  is available, use a clear final question and resume from recorded artifacts after
  the answer. A missing answer is not authorization. Do independent work while waiting.
- Run shell commands shown as examples deliberately, with proper argv/quoting.
  Prefer `rg`/`rg --files` for searches; do not copy a placeholder literally.
  Report observed results only. Existing specs/reports do not override live config.

## Аргументы

$ARGUMENTS

## Что сделать

Шкала и формат — `docs/issue-priority.md`, прочитай его целиком. Оценку выбирает scorer-субагент, записывает её только `scripts/issue-priority.mjs set` (блок в описании руками не править).

### 1. Собрать issues

- Номера в аргументах → для каждого `gh issue view <N> --json number,title,body,labels,state`; закрытые пропустить.
- Без номеров → `node scripts/issue-priority.mjs unscored`.
- `--all` → `gh issue list --state open --limit 300 --json number,title,body,labels`; если достигнут лимит, пагинировать до полного набора. Аналогично увеличить `unscored --limit` или пагинировать, если открытых issues больше 300.
- `--draft` / запрос только оценки → те же независимые scorer-пачки, но без записи в GitHub.

Если список пуст — сказать «все открытые issues уже оценены» и закончить.

### 2. Оценить (независимые scorer-агенты)

Тексты issues через свой контекст не гонять: записать их скриптом (не руками) в файлы-пачки по 8 issues — JSON-массив `{number, title, labels, body}`, тело без старого блока `<!-- priority -->…<!-- /priority -->` с целевым размером ~4000 символов для компактной пачки; сохранить полный текст/значимые комментарии рядом и передать путь, если сокращение теряет существенные доказательства, — во временный каталог (scratchpad сессии, если есть; иначе `mktemp -d`), доступный субагентам через инструмент чтения. Затем запустить по субагенту на пачку, параллельно в пределах слотов, остальные пачки — следующими волнами: инструмент делегирования с наследуемой моделью Codex и ролью scorer. Субагенту ничего не нужно искать в коде и в GitHub. Промпт:

- прочитать `docs/issue-priority.md` (абсолютный путь; разделы Context, Criteria, Bands) и файл своей пачки (абсолютный путь);
- задача: по каждому issue выбрать баллы по четырём критериям строго по таблицам и актуальному Context `docs/issue-priority.md`; не предполагать работающий VPS или активный production, инфраструктура разработки на Mac нужна агентам каждый день; объяснение — одна фраза на русском, почему именно столько (что ломается, у кого, есть ли обход);
- формат ответа — только JSON-массив без пояснений: `[{"number": 12, "impact": 30, "reach": 15, "urgency": 10, "workaround": 8, "why": "…"}]`.

Проверить ответ: JSON парсится, есть каждый номер пачки ровно один раз, посторонних номеров нет, баллы — целые в пределах (40/25/20/15), `why` не пустой. Пачку с ошибкой перезапустить один раз; если снова не так — эти issues перечислить в итоге как неоценённые.

### 3. Записать

`score = impact + reach + urgency + workaround` (максимум 100). Границы:
80–100 → P0-critical, 60–79 → P1-high, 40–59 → P2-medium,
20–39 → P3-low, 0–19 → P4-trivial. Источник рубрики — `docs/issue-priority.md`.
В `--draft` вернуть расчёт и не запускать writer. После каждой записи прочитать
body/labels; при сбое сохранить предложение, продолжить независимые issues и
явно перечислить неполный результат. Репозиторий writer задаётся проверенным `GH_REPO`.


По каждому issue:

```bash
node scripts/issue-priority.mjs set <N> --impact <i> --reach <r> --urgency <u> --workaround <w> --why "<why>"
```

### 4. Итог

Таблица, отсортированная по оценке: `#N` (ссылка), оценка, метка, заголовок, «почему». Отдельной строкой — неоценённые, если есть. Ничего больше не делать: issues не чинить и не закрывать.
