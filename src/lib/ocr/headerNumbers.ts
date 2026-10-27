/**
 * Parsing for the banner stats line: [shield icon] 234,142,924 [skull icon] 2,821,828
 *
 * Tesseract does not see the icons, so the two numbers frequently come back glued into one token
 * ("234,142,9242,821,828"), sometimes with a stray digit from the shield in front ("11234,142,924...")
 * or with the comma lost ("2 821,828"). Number formatting makes all of this recoverable:
 * every comma group after the first has exactly three digits.
 */

/** Splits OCR text from the stats line into digit strings, one per number, in reading order. */
export function splitMergedNumbers(text: string): string[] {
  const raw = text
    .split(/\s+/)
    .map((t) => t.replace(/[^\d,]/g, '').replace(/^,+|,+$/g, ''))
    .filter((t) => /\d/.test(t));

  // Lost comma: "2" followed by "821,828" is "2,821,828"
  const toks: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    const next = raw[i + 1];
    if (next && /^\d{1,3}$/.test(raw[i]) && /^\d{3}(,\d{3})+$/.test(next)) {
      toks.push(`${raw[i]},${next}`);
      i++;
    } else {
      toks.push(raw[i]);
    }
  }

  const out: string[] = [];
  for (const tok of toks) {
    const groups = tok.split(',').filter(Boolean);
    let cur: string[] = [];
    const flush = () => {
      if (cur.length) out.push(cur.join(''));
      cur = [];
    };
    for (const g of groups) {
      if (cur.length === 0) {
        cur.push(g.length > 3 ? g.slice(-3) : g); // first group is 1-3 digits; extra leading digits are icon noise
      } else if (g.length <= 3) {
        cur.push(g);
      } else if (g.length <= 6) {
        cur.push(g.slice(0, 3)); // end of one number...
        flush();
        cur.push(g.slice(3)); // ...glued to the start of the next
      } else {
        cur.push(g.slice(-3));
      }
    }
    flush();
  }
  return out;
}

/** If `digits` equals `sum` after dropping leading junk digits (shield icon read as 1, 11, ...), return the clean digits. */
export function matchSum(digits: string, sum: number): string | null {
  const need = String(sum).length;
  let d = digits;
  while (d.length >= need) {
    if (Number(d) === sum) return d;
    d = d.slice(1);
  }
  return null;
}

export interface HeaderRead {
  power: string | null;
  kills: string | null;
  /** power equals the sum of the five table rows */
  matched: boolean;
}

/** Interpret one OCR read of the stats line. `sum` is the total of the five power rows (null if unknown). */
export function readHeader(text: string, sum: number | null): HeaderRead {
  const nums = splitMergedNumbers(text);
  const clean = (d: string | undefined) => (d ? d.replace(/^0+(?=\d)/, '') : null);

  if (sum !== null) {
    for (let i = 0; i < nums.length; i++) {
      const m = matchSum(nums[i], sum);
      if (m) return { power: m, kills: clean(nums[i + 1]), matched: true };
    }
  }
  return { power: nums[0] ?? null, kills: clean(nums[1]), matched: false };
}

export interface HeaderChoice {
  power: string | null;
  kills: string | null;
  matched: boolean;
  /** Most reads agreed on kills (kills has no checksum, so agreement is the only evidence) */
  consistent: boolean;
}

/** Combine several independent reads (different scale/threshold) into one answer. */
export function chooseHeader(reads: HeaderRead[]): HeaderChoice {
  const matched = reads.filter((r) => r.matched);
  const pool = matched.length ? matched : reads;

  const tally = new Map<string, number>();
  for (const r of pool) if (r.kills) tally.set(r.kills, (tally.get(r.kills) ?? 0) + 1);
  const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  const kills = ranked[0]?.[0] ?? null;
  const topCount = ranked[0]?.[1] ?? 0;
  const total = [...tally.values()].reduce((a, b) => a + b, 0);

  const withKills = pool.find((r) => r.kills === kills);
  return {
    power: withKills?.power ?? pool[0]?.power ?? null,
    kills,
    matched: matched.length > 0,
    consistent: topCount >= 2 && topCount * 2 > total,
  };
}
