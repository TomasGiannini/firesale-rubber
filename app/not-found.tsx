import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center">
        <p className="text-sm tracking-widest mb-4" style={{ color: '#f0c040' }}>
          404 · PAGE NOT FOUND
        </p>
        <h1 className="text-6xl font-bold mb-6" style={{ color: '#fff' }}>
          Nothing Here
        </h1>
        <p className="mb-10 max-w-md mx-auto" style={{ color: '#888' }}>
          That page doesn't exist. Head back to the catalog and browse our overstock rubber products.
        </p>
        <Link
          href="/"
          className="inline-block font-semibold px-8 py-3 text-sm tracking-wider transition-colors"
          style={{ background: '#f0c040', color: '#0a0e1a' }}
        >
          BACK TO CATALOG
        </Link>
      </div>
    </main>
  )
}
