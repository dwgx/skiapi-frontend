// 输入框占位符的打字机轮播。参考 OpenAI / Claude Code 的做法：
// 一句话逐字打出来 → 停一下 → 逐字删回去 → 换下一句。
//
// 只在「输入框为空且没在生成」时跑 —— 用户一开始打字就停，避免抢注意力。
// 用 requestAnimationFrame 的节流循环而不是 setInterval 密集触发 setState：
// 每个字一次 setState 在 60fps 下太密，这里按时间阈值推进。

import { useEffect, useRef, useState } from 'react';

// 每句话随机一套节奏 —— 固定速度看起来很机械，像个进度条。
// 真人打字有快有慢，每句换一次速度、每个字再抖一点，观感自然得多。
const TYPE_MS_RANGE = [38, 95];    // 每字打出间隔的随机区间
const DELETE_MS_RANGE = [18, 40];  // 删除比打字快
const HOLD_MS_RANGE = [1100, 2100]; // 打完停留
const GAP_MS_RANGE = [220, 480];    // 删完到下一句

const rand = ([lo, hi]) => lo + Math.random() * (hi - lo);

// 每句开始时抽一套节奏
function nextRhythm() {
  return {
    type: rand(TYPE_MS_RANGE),
    del: rand(DELETE_MS_RANGE),
    hold: rand(HOLD_MS_RANGE),
    gap: rand(GAP_MS_RANGE),
  };
}

// 单个字符的抖动：在该句基准速度上 ±35% 浮动，标点后多停一下
function charDelay(base, ch) {
  const jitter = base * (0.65 + Math.random() * 0.7);
  if (ch && '，。、？！,.?!;；：:'.includes(ch)) return jitter + base * 2.2;
  return jitter;
}

export function useTypewriterPlaceholder(phrases, active) {
  const [text, setText] = useState('');
  // 可变状态放 ref：每帧都读写，放 state 会引发大量重渲染。
  // wait 是「到下一个字要等多久」—— 每个字重抽一次，做出快慢不均的手感。
  const stateRef = useRef({
    idx: 0, len: 0, phase: 'type', last: 0,
    rhythm: nextRhythm(), wait: 0,
  });

  useEffect(() => {
    if (!active || !phrases?.length) {
      // 不在这里 setText('')：effect 里同步 setState 会触发级联渲染
      // （react-hooks/set-state-in-effect）。停跑就够了，返回值由 active 决定。
      stateRef.current = {
        idx: 0, len: 0, phase: 'type', last: 0,
        rhythm: nextRhythm(), wait: 0,
      };
      return undefined;
    }

    let raf = 0;
    const tick = (now) => {
      const s = stateRef.current;
      // 随机顺序播放：用 idx 走一遍再洗牌不必要，简单按序但每句节奏不同
      const phrase = phrases[s.idx % phrases.length];
      const elapsed = now - s.last;

      if (s.phase === 'type') {
        if (elapsed >= s.wait) {
          s.last = now;
          if (s.len < phrase.length) {
            s.len += 1;
            setText(phrase.slice(0, s.len));
            // 下一个字的等待时间按「刚打出的字」决定（标点后停顿更久）
            s.wait = charDelay(s.rhythm.type, phrase[s.len - 1]);
          } else {
            s.phase = 'hold';
            s.wait = s.rhythm.hold;
          }
        }
      } else if (s.phase === 'hold') {
        if (elapsed >= s.wait) {
          s.last = now;
          s.phase = 'delete';
          s.wait = s.rhythm.del;
        }
      } else if (s.phase === 'delete') {
        if (elapsed >= s.wait) {
          s.last = now;
          if (s.len > 0) {
            s.len -= 1;
            setText(phrase.slice(0, s.len));
            s.wait = s.rhythm.del * (0.7 + Math.random() * 0.6);
          } else {
            s.phase = 'gap';
            s.wait = s.rhythm.gap;
          }
        }
      } else if (s.phase === 'gap') {
        if (elapsed >= s.wait) {
          s.last = now;
          s.idx += 1;
          s.phase = 'type';
          // 换句 → 换一套节奏，所以下一句可能明显更快或更慢
          s.rhythm = nextRhythm();
          s.wait = s.rhythm.type;
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame((t) => {
      stateRef.current.last = t;
      stateRef.current.wait = stateRef.current.rhythm.type;
      tick(t);
    });
    return () => cancelAnimationFrame(raf);
  }, [phrases, active]);

  // 不活跃时直接返回空串（而不是在 effect 里清 state）
  return active ? text : '';
}
