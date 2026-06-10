import { JsonLd } from './JsonLd'

export function WebsiteJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Firesale Rubber',
        url: 'https://www.firesalerubber.com',
        description: 'Overstock and defective rubber products at clearance prices.',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: 'https://www.firesalerubber.com/search?q={search_term_string}',
          },
          'query-input': 'required name=search_term_string',
        },
      }}
    />
  )
}
