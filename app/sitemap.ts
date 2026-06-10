import type { MetadataRoute } from 'next'

const BASE = 'https://www.firesalerubber.com'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE}/admin`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ]
}
