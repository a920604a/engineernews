import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { ImageResponse } from '@vercel/og';
import { createElement } from 'react';
import { getOgCacheKey, isOgSiteRoute, parseOgArticleRoute } from '../../../lib/shareCard';

import fontUrl from '@fontsource/noto-sans-tc/files/noto-sans-tc-chinese-traditional-900-normal.woff?url';

const h = createElement;
const FONT_FAMILY = 'Noto Sans TC';
const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

let fontDataPromise: Promise<ArrayBuffer> | null = null;

async function getFontData(baseUrl: string) {
  if (!fontDataPromise) {
    fontDataPromise = fetch(new URL(fontUrl, baseUrl)).then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load OG font: ${response.status}`);
      }

      return response.arrayBuffer();
    });
  }

  return fontDataPromise;
}

async function getPostForShareCard(lang: 'zh-TW' | 'en', postId: string) {
  const posts = await getCollection('posts', ({ data }) => !data.draft && data.lang === lang);
  return posts.find((post) => post.id === postId);
}

function SiteCard() {
  return h(
    'div',
    {
      style: {
        display: 'flex',
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, #050505 0%, #121212 40%, #0a0a0a 100%)',
        color: '#fff',
        padding: '64px',
        fontFamily: FONT_FAMILY,
      },
    },
    h(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
        },
      },
      h(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '24px',
            fontWeight: 900,
            letterSpacing: '-0.02em',
          },
        },
        h('div', {
          style: {
            width: '16px',
            height: '16px',
            borderRadius: '999px',
            background: '#0a84ff',
            boxShadow: '0 0 24px rgba(10,132,255,0.85)',
          },
        }),
        'Engineer News'
      ),
      h(
        'div',
        {
          style: {
            padding: '8px 16px',
            borderRadius: '999px',
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(255,255,255,0.06)',
            fontSize: '18px',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.82)',
          },
        },
        'Site Preview'
      )
    ),
    h(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          maxWidth: '1020px',
        },
      },
      h(
        'div',
        {
          style: {
            display: 'flex',
            alignSelf: 'flex-start',
            padding: '8px 16px',
            borderRadius: '999px',
            background: '#0a84ff',
            fontSize: '20px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          },
        },
        'Engineer News'
      ),
      h(
        'div',
        {
          style: {
            fontSize: '72px',
            lineHeight: 1.05,
            fontWeight: 900,
            letterSpacing: '-0.04em',
          },
        },
        '技術決策即文件'
      ),
      h(
        'div',
        {
          style: {
            maxWidth: '920px',
            fontSize: '26px',
            lineHeight: 1.5,
            color: 'rgba(255,255,255,0.74)',
          },
        },
        'Technical notes worth sharing'
      )
    ),
    h(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '24px',
          paddingTop: '12px',
          borderTop: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.55)',
          fontSize: '18px',
        },
      },
      h('span', null, 'engineer-news.pages.dev'),
      h('span', null, '給一週後的自己，也給遇到同樣問題的人')
    )
  );
}

function ShareCard({
  title,
  category,
  tldr,
  lang,
}: {
  title: string;
  category: string;
  tldr?: string;
  lang: 'zh-TW' | 'en';
}) {
  return h(
    'div',
    {
      style: {
        display: 'flex',
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, #050505 0%, #121212 40%, #0a0a0a 100%)',
        color: '#fff',
        padding: '64px',
        fontFamily: FONT_FAMILY,
      },
    },
    h(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
        },
      },
      h(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '24px',
            fontWeight: 900,
            letterSpacing: '-0.02em',
          },
        },
        h('div', {
          style: {
            width: '16px',
            height: '16px',
            borderRadius: '999px',
            background: '#0a84ff',
            boxShadow: '0 0 24px rgba(10,132,255,0.85)',
          },
        }),
        'Engineer News'
      ),
      h(
        'div',
        {
          style: {
            padding: '8px 16px',
            borderRadius: '999px',
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(255,255,255,0.06)',
            fontSize: '18px',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.82)',
          },
        },
        lang === 'en' ? 'Share Card' : '社群分享卡'
      )
    ),
    h(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          maxWidth: '1020px',
        },
      },
        h(
        'div',
        {
          style: {
            display: 'flex',
            alignSelf: 'flex-start',
            padding: '8px 16px',
            borderRadius: '999px',
            background: '#0a84ff',
            fontSize: '20px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          },
        },
        category
      ),
      h(
        'div',
        {
          style: {
            fontSize: '72px',
            lineHeight: 1.05,
            fontWeight: 900,
            letterSpacing: '-0.04em',
          },
        },
        title
      ),
      tldr
        ? h(
            'div',
            {
              style: {
                maxWidth: '920px',
                fontSize: '26px',
                lineHeight: 1.5,
                color: 'rgba(255,255,255,0.74)',
              },
            },
            tldr
          )
        : null
    ),
    h(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '24px',
          paddingTop: '12px',
          borderTop: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.55)',
          fontSize: '18px',
        },
      },
      h('span', null, 'engineer-news.pages.dev'),
      h('span', null, lang === 'en' ? 'Technical notes worth sharing' : '給一週後的自己，也給遇到同樣問題的人')
    )
  );
}

export const GET: APIRoute = async ({ params, locals, request }) => {
  const slug = params.slug ?? '';
  const requestPath = getOgCacheKey(slug);
  const route = parseOgArticleRoute(requestPath);
  const siteRoute = isOgSiteRoute(requestPath);

  if (!siteRoute && !route) {
    return new Response('Not found', { status: 404 });
  }

  const cacheKey = siteRoute ? 'site' : requestPath;

  const { OG_IMAGES } = locals.runtime.env;
  let cached = null;

  try {
    cached = await OG_IMAGES.get(cacheKey);
  } catch (error) {
    console.warn(`OG cache lookup failed for ${cacheKey}`, error);
    cached = null;
  }

  if (cached) {
    const body = await cached.arrayBuffer();
    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Content-Type', 'image/png');
    return new Response(body, { headers });
  }

  const fontData = await getFontData(request.url);
  const post = route ? await getPostForShareCard(route.lang, route.postId) : null;

  if (route && !post) {
    return new Response('Not found', { status: 404 });
  }

  const response = new ImageResponse(
    siteRoute
      ? h(SiteCard)
      : route
        ? h(ShareCard, {
            title: post?.data.title ?? '',
            category: post?.data.category ?? '',
            tldr: post?.data.tldr,
            lang: route.lang,
          })
        : null,
    {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      fonts: [{ name: FONT_FAMILY, data: fontData, weight: 900, style: 'normal' }],
    }
  );
  const png = await response.arrayBuffer();

  await OG_IMAGES.put(cacheKey, png);

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
