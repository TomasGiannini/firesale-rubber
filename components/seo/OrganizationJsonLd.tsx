import { JsonLd } from './JsonLd'

export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        '@id': 'https://www.firesalerubber.com/#organization',
        name: 'Firesale Rubber',
        url: 'https://www.firesalerubber.com',
        logo: 'https://www.firesalerubber.com/logo.png',
        description: 'Overstock and defective rubber products at clearance prices in Vaughan, Ontario.',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Vaughan',
          addressRegion: 'ON',
          addressCountry: 'CA',
        },
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer service',
          telephone: '+1-416-788-1629',
          email: 'hello@firesalerubber.com',
        },
        areaServed: {
          '@type': 'Place',
          name: 'Vaughan, Ontario, Canada',
        },
      }}
    />
  )
}
