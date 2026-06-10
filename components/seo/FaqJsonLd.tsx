import { JsonLd } from './JsonLd'

interface FAQ {
  question: string
  answer: string
}

export function FaqJsonLd({ faqs }: { faqs: FAQ[] }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      }}
    />
  )
}
