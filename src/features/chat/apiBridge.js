// API 适配层（apiBridge）：把 New API 血统的前端逻辑接到 sub2api。
//
// 契约已对 Wei-Shaw/sub2api v0.1.171 源码 + 其官方 Vue 前端逐项核实：
//   登录    POST /api/v1/auth/login      body{email,password}
//                                        → data{access_token,refresh_token,expires_in,token_type}
//                                        2FA 时 → data{requires_2fa:true,temp_token}
//   2FA     POST /api/v1/auth/login/2fa  body{temp_token,totp_code}
//   我      GET  /api/v1/auth/me         Bearer JWT
//   密钥    GET  /api/v1/keys            Bearer JWT → data{items:[{key(明文),name,status,quota,quota_used}]}
//   仪表盘  GET  /api/v1/usage/dashboard/stats     Bearer JWT（面板用，聚合快）
//   模型    GET  /api/v1/models 或 /v1/models
//   推理    POST /v1/chat/completions    Bearer <API key>（不是 JWT！JWT 调不通 /v1）
// 统一响应包 {code:0,message,data}；分页 data={items,total,page,page_size,pages}。
//
// 两个关键事实决定了整个设计：
//   1. /keys 列表【返回明文 key】—— 聊天页可登录后自动取，用户无需手填。
//   2. /v1 只认 API key，不认 JWT —— 所以流程必须是 JWT 拉 key，再用 key 聊天。

const SUB2API = 'sub2api';
const NEWAPI = 'newapi';

// sub2api 官方前端把 JWT 存在 localStorage 扁平键（auth_token 等，见
// frontend/src/stores/auth.ts 的 AUTH_TOKEN_KEY）。同域部署时直接复用它的登录态 ——
// 这是"账户互通"最省事的路径：面板登录过，聊天页无需二次登录。
// 兼容多种键名（官方扁平键优先，Pinia 持久化 'auth' 作回退）。
export function readSub2apiToken() {
  // 1) 官方扁平键（v0.1.171 实测唯一写法）
  const flat =
    localStorage.getItem('auth_token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('access_token');
  if (flat) return flat;
  // 2) Pinia 持久化的 auth store（某些自定义部署/旧版）
  try {
    const raw = localStorage.getItem('auth');
    if (raw) {
      const parsed = JSON.parse(raw);
      const tok = parsed?.accessToken || parsed?.access_token;
      if (tok) return tok;
    }
  } catch { /* 结构变了就返回 null */ }
  return null;
}

function getNewapiUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function detectBackendMode() {
  if (readSub2apiToken()) return SUB2API;
  if (getNewapiUser()) return NEWAPI;
  return SUB2API; // 生产默认 sub2api
}

// sub2api 后端对 GET 期望带 timezone（官方前端全局注入），跟随该约定
function withTz(url) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  return url + (url.includes('?') ? '&' : '?') + 'timezone=' + encodeURIComponent(tz);
}

async function getJson(url, headers) {
  const res = await fetch(url, { headers });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
}

async function sub2apiResolve() {
  const token = readSub2apiToken();
  if (!token) {
    const err = new Error('请先登录 sub2api 面板');
    err.code = 'NOT_LOGGED_IN';
    throw err;
  }
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 用户信息（email/余额）。失败不致命，聊天仍可进行。
  let userInfo = null;
  try {
    const me = await getJson(withTz('/api/v1/auth/me'), authHeaders);
    if (me.body?.code === 0) userInfo = me.body.data;
  } catch { /* 非致命 */ }

  // 取用户第一个可用 key（明文）
  const keyRes = await getJson(withTz('/api/v1/keys?page_size=20'), authHeaders);
  if (keyRes.status === 401) {
    const err = new Error('登录已过期，请重新登录');
    err.code = 'TOKEN_EXPIRED';
    throw err;
  }
  if (keyRes.body?.code !== 0) {
    const err = new Error(keyRes.body?.message || '获取 API key 失败');
    err.code = 'KEY_FETCH_FAILED';
    throw err;
  }
  // 选 key。多数账号只有一个 key，这里的挑选逻辑主要是为了：
  //   1. 优先 active 的（禁用的 key 请求必然 401）
  //   2. 跳过没有明文 key 的项（理论上不该有，防御性）
  //   3. 单 key 时就是它，没有歧义
  const items = keyRes.body.data?.items || [];
  const usable = items.filter((k) => k?.key);
  const active = usable.find((k) => k.status === 'active') || usable[0];
  if (!active?.key) {
    // 区分「一个 key 都没有」和「有 key 但全被禁用」—— 用户要做的事不同
    const err = new Error(
      items.length
        ? 'API key 全部被禁用，请在面板启用或新建一个'
        : '账号下还没有 API key，请先在面板创建一个'
    );
    err.code = 'NO_KEYS';
    throw err;
  }

  const keyHeaders = () => ({
    Authorization: `Bearer ${active.key}`,
    'Content-Type': 'application/json',
  });

  return {
    mode: SUB2API,
    userInfo,
    apiKey: active.key,
    keyInfo: { name: active.name, quota: active.quota, quotaUsed: active.quota_used },
    chatUrl: '/v1/chat/completions',
    // 分组列表。**每项带上该分组自己的模型列表** —— 每个分组可用模型不同，
    // 切分组必须换模型候选，否则会拿一个别的分组的模型去请求，必然失败。
    //
    // sub2api 的用户端点 /api/v1/groups/available 只返回「用户有订阅/权限」的
    // 分组（service 逻辑：活跃分组 ∩ 用户订阅），普通用户常为空。
    // /api/v1/admin/groups/all 能列全部**且**带 models_list_config，
    // 所以一次请求就够，不必切分组时再往返一次。
    listGroups: async () => {
      const pickModels = (g) => {
        const cfg = g?.models_list_config || g?.modelsListConfig;
        const list = cfg?.models;
        return Array.isArray(list)
          ? list.filter((m) => typeof m === 'string' && m.trim()).map((m) => m.trim())
          : [];
      };

      const admin = await getJson(withTz('/api/v1/admin/groups/all'), authHeaders).catch(() => null);
      if (admin?.body?.code === 0) {
        const raw = admin.body.data;
        const arr = Array.isArray(raw) ? raw : raw?.items;
        if (Array.isArray(arr) && arr.length) {
          return arr.map((g) => ({
            value: g.name ?? String(g.id),
            label: g.name || String(g.id),
            models: pickModels(g),
          }));
        }
      }

      // 回退：用户端点没有 models_list_config，models 给空数组
      // （上层会退回「全部模型」而不是空列表）
      const user = await getJson(withTz('/api/v1/groups/available'), authHeaders).catch(() => null);
      if (user?.body?.code !== 0) return [];
      const d = user.body.data;
      if (Array.isArray(d)) {
        return d.map((x) => ({
          value: x.name ?? String(x.id),
          label: x.description || x.name || String(x.id),
          models: pickModels(x),
        }));
      }
      if (d && typeof d === 'object') {
        return Object.entries(d).map(([k, v]) => ({
          value: k,
          label: v?.description || v?.desc || k,
          models: pickModels(v),
        }));
      }
      return [];
    },
    // 模型列表。三路取并集，取到最全的一份。
    //
    // 为什么不能只靠 /v1/models：那个网关端点带 requireGroupAnthropic 中间件，
    // 返回的是「当前 API key 所属分组」的模型，key 绑单分组时就只有那一小撮
    // （实测线上只返回 1 个 → 就是「模型列表只有一个」的根因）。
    // 真源是每个分组的 models_list_config，管理员可从 admin/groups/all 拿全。
    //
    // 注意 /api/v1/models 在 sub2api v0.1.171 里**不存在**（user.go 无此路由），
    // 所以不再请求它。
    listModels: async () => {
      const collected = new Set();

      // 1) 管理员：从全部分组的 models_list_config 汇总（最全）
      const admin = await getJson(withTz('/api/v1/admin/groups/all'), authHeaders).catch(() => null);
      if (admin?.body?.code === 0) {
        const raw = admin.body.data;
        const groupArr = Array.isArray(raw) ? raw : raw?.items || [];
        for (const g of groupArr) {
          const cfg = g?.models_list_config || g?.modelsListConfig;
          const list = cfg?.models;
          if (Array.isArray(list)) {
            for (const m of list) if (typeof m === 'string' && m.trim()) collected.add(m.trim());
          }
        }
      }

      // 2) 网关 /v1/models（当前 key 分组可用的，权威但可能窄）
      const v1 = await getJson('/v1/models', keyHeaders()).catch(() => null);
      const v1list = v1?.body?.data;
      if (Array.isArray(v1list)) {
        for (const x of v1list) {
          const id = typeof x === 'string' ? x : x?.id;
          if (typeof id === 'string' && id.trim()) collected.add(id.trim());
        }
      }

      // 稳定排序：claude 系列在前，其余字母序 —— 让常用模型靠上
      return [...collected].sort((a, b) => {
        const ca = a.toLowerCase().includes('claude') ? 0 : 1;
        const cb = b.toLowerCase().includes('claude') ? 0 : 1;
        return ca !== cb ? ca - cb : a.localeCompare(b);
      });
    },
    getHeaders: keyHeaders,
    // 用量：面板聚合端点（JWT 认证）
    getUsage: async () => {
      const r = await getJson(withTz('/api/v1/usage/dashboard/stats'), authHeaders).catch(() => null);
      return r?.body?.code === 0 ? r.body.data : null;
    },
  };
}

// New API 兼容模式（当前生产是 sub2api，此为回退路径）
async function newapiResolve() {
  let apiKey = localStorage.getItem('chat_key') || localStorage.getItem('playground_key');
  if (!apiKey) {
    try {
      const res = await fetch('/api/token/?p=1&page_size=1', { credentials: 'include' }).then((r) => r.json());
      const items = res.data?.items || (Array.isArray(res.data) ? res.data : []);
      if (items[0]?.key) apiKey = 'sk-' + items[0].key;
    } catch { /* noop */ }
  }
  if (!apiKey) {
    const err = new Error('没有可用的 API key');
    err.code = 'NO_KEYS';
    throw err;
  }
  const keyHeaders = () => ({ Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' });
  return {
    mode: NEWAPI,
    userInfo: getNewapiUser(),
    apiKey,
    keyInfo: null,
    chatUrl: '/v1/chat/completions',
    listModels: async () => {
      try {
        const res = await fetch('/api/user/models', { credentials: 'include' }).then((r) => r.json());
        const d = res?.data;
        return Array.isArray(d) ? d.filter((x) => typeof x === 'string') : [];
      } catch {
        return [];
      }
    },
    getHeaders: keyHeaders,
    getUsage: async () => null,
  };
}

export async function createApiBridge() {
  return detectBackendMode() === SUB2API ? sub2apiResolve() : newapiResolve();
}
