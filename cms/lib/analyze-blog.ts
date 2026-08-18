export type BlogPlatform = "naver" | "tistory" | "unknown";

export type BlogPostItem = {
  title: string;
  url: string;
  date: string | null;
  excerpt: string;
};

export type BlogReport = {
  platform: BlogPlatform;
  input: string;
  url: string;
  title: string;
  description: string;
  posts: BlogPostItem[];
  popular: BlogPostItem[];
  trend: { date: string; count: number }[];
  stats: {
    totalPosts: number;
    last30Days: number;
    avgPerWeek: number;
    daysSinceLastPost: number | null;
  };
  grade: {
    label: string;
    rankHint: string;
    note: string;
  };
  notes: string[];
  analyzedAt: string;
};

function stripCdata(s: string) {
  return s.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}

function decodeEntities(s: string) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRssItems(xml: string): BlogPostItem[] {
  const items: BlogPostItem[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const block of blocks) {
    const title = stripCdata((block.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
    const link = stripCdata((block.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [])[1] || "");
    const guid = stripCdata((block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i) || [])[1] || "");
    const dateRaw =
      stripCdata((block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) || [])[1] || "") ||
      stripCdata((block.match(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i) || [])[1] || "");
    const desc = stripCdata(
      (block.match(/<description[^>]*>([\s\S]*?)<\/description>/i) || [])[1] || ""
    );
    const url = (link || guid).trim();
    if (!title || !url) continue;
    const d = dateRaw ? new Date(dateRaw) : null;
    items.push({
      title: decodeEntities(title),
      url,
      date: d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : null,
      excerpt: decodeEntities(desc).slice(0, 160),
    });
  }
  return items;
}

function channelTitle(xml: string) {
  const ch = xml.match(/<channel[\s\S]*?<item/i)?.[0] || xml.slice(0, 2000);
  const title = stripCdata((ch.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
  const desc = stripCdata((ch.match(/<description[^>]*>([\s\S]*?)<\/description>/i) || [])[1] || "");
  return { title: decodeEntities(title), description: decodeEntities(desc).slice(0, 240) };
}

function detectPlatform(input: string): { platform: BlogPlatform; rssUrl: string; pageUrl: string } {
  const raw = input.trim();
  // blog.naver.com/id or m.blog.naver.com/id
  const naver = raw.match(/(?:m\.)?blog\.naver\.com\/([A-Za-z0-9._-]+)/i);
  if (naver) {
    const id = naver[1];
    return {
      platform: "naver",
      rssUrl: `https://rss.blog.naver.com/${id}.xml`,
      pageUrl: `https://blog.naver.com/${id}`,
    };
  }
  // bare naver id
  if (/^[A-Za-z0-9._-]{3,40}$/.test(raw) && !raw.includes(".")) {
    return {
      platform: "naver",
      rssUrl: `https://rss.blog.naver.com/${raw}.xml`,
      pageUrl: `https://blog.naver.com/${raw}`,
    };
  }
  // xxx.tistory.com
  const tistory = raw.match(/(https?:\/\/)?([A-Za-z0-9-]+)\.tistory\.com/i);
  if (tistory) {
    const host = `${tistory[2]}.tistory.com`;
    return {
      platform: "tistory",
      rssUrl: `https://${host}/rss`,
      pageUrl: `https://${host}`,
    };
  }
  // custom domain — try /rss
  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    return {
      platform: "unknown",
      rssUrl: `${u.origin}/rss`,
      pageUrl: u.origin,
    };
  } catch {
    throw new Error("블로그 URL 또는 네이버 블로그 ID를 확인해 주세요.");
  }
}

function buildTrend(posts: BlogPostItem[]) {
  const map = new Map<string, number>();
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  for (const p of posts) {
    if (!p.date) continue;
    if (map.has(p.date)) map.set(p.date, (map.get(p.date) || 0) + 1);
  }
  return [...map.entries()].map(([date, count]) => ({ date, count }));
}

function gradeFromStats(last30: number, daysSince: number | null, total: number) {
  if (total === 0) {
    return { label: "일반", rankHint: "수집된 글이 없습니다", note: "RSS에서 글을 찾지 못했습니다." };
  }
  if (daysSince != null && daysSince > 60) {
    return {
      label: "휴면 경향",
      rankHint: "최근 발행이 뜸합니다",
      note: "발행 리듬을 회복하면 지수·유입에 유리합니다.",
    };
  }
  if (last30 >= 12) {
    return {
      label: "활발",
      rankHint: "발행 활동이 활발합니다",
      note: "최근 30일 발행량이 많아 활동성 지표가 양호합니다.",
    };
  }
  if (last30 >= 4) {
    return {
      label: "꾸준함",
      rankHint: "꾸준한 발행 패턴",
      note: "주 1회 이상 발행을 유지하면 좋습니다.",
    };
  }
  return {
    label: "보완 필요",
    rankHint: "발행 빈도 보완 여지",
    note: "최근 발행이 적어 활동성 보완이 필요합니다.",
  };
}

export async function analyzeBlog(input: string): Promise<BlogReport> {
  const detected = detectPlatform(input);
  const notes: string[] = [];

  let xml = "";
  let usedRss = detected.rssUrl;
  try {
    const res = await fetch(detected.rssUrl, {
      cache: "no-store",
      headers: { "User-Agent": "dd2mak-cms/1.0", Accept: "application/rss+xml, application/xml, text/xml, */*" },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`RSS ${res.status}`);
    xml = await res.text();
  } catch {
    if (detected.platform === "unknown" || detected.platform === "tistory") {
      // try /feed
      const alt = detected.pageUrl.replace(/\/$/, "") + "/feed";
      const res2 = await fetch(alt, {
        cache: "no-store",
        headers: { "User-Agent": "dd2mak-cms/1.0" },
      });
      if (!res2.ok) throw new Error("블로그 RSS를 가져오지 못했습니다. 주소·공개 여부를 확인하세요.");
      xml = await res2.text();
      usedRss = alt;
      notes.push(`대체 피드 사용: ${alt}`);
    } else {
      throw new Error("네이버 블로그 RSS를 가져오지 못했습니다. 블로그 ID·공개 설정을 확인하세요.");
    }
  }

  notes.push(`수집 피드: ${usedRss}`);
  const meta = channelTitle(xml);
  const posts = parseRssItems(xml).slice(0, 30);
  const trend = buildTrend(posts);
  const last30Days = trend.reduce((a, b) => a + b.count, 0);
  const dated = posts.filter((p) => p.date).map((p) => p.date!) ;
  const lastDate = dated.sort().at(-1) || null;
  const daysSinceLastPost = lastDate
    ? Math.max(0, Math.round((Date.now() - new Date(lastDate).getTime()) / 86400000))
    : null;
  const avgPerWeek = Math.round((last30Days / 30) * 7 * 10) / 10;

  // 인기 포스팅 대용: 최근 글 중 발췌가 긴 글 / 최신순 상위
  const popular = [...posts]
    .sort((a, b) => (b.excerpt?.length || 0) - (a.excerpt?.length || 0))
    .slice(0, detected.platform === "tistory" ? 6 : 10);

  return {
    platform: detected.platform === "unknown" && usedRss.includes("tistory") ? "tistory" : detected.platform,
    input: input.trim(),
    url: detected.pageUrl,
    title: meta.title || detected.pageUrl,
    description: meta.description,
    posts: posts.slice(0, 10),
    popular,
    trend,
    stats: {
      totalPosts: posts.length,
      last30Days,
      avgPerWeek,
      daysSinceLastPost,
    },
    grade: gradeFromStats(last30Days, daysSinceLastPost, posts.length),
    notes,
    analyzedAt: new Date().toISOString(),
  };
}
