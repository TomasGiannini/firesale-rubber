import { JsonLd } from './JsonLd'

interface Post {
  title: string
  excerpt: string
  slug: string
  publishedAt: string
  updatedAt?: string
  ogImage?: string
}

export function ArticleJsonLd({ post }: { post: Post }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description: post.excerpt,
        image:
          post.ogImage ||
          'https://www.firesalerubber.com/og/blog-og.jpg',
        datePublished: post.publishedAt,
        dateModified: post.updatedAt || post.publishedAt,
        author: {
          '@type': 'Organization',
          name: 'Firesale Rubber',
          url: 'https://www.firesalerubber.com',
        },
        publisher: {
          '@type': 'Organization',
          name: 'Firesale Rubber',
          logo: {
            '@type': 'ImageObject',
            url: 'https://www.firesalerubber.com/logo.png',
          },
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `https://www.firesalerubber.com/blog/${post.slug}`,
        },
      }}
    />
  )
}
