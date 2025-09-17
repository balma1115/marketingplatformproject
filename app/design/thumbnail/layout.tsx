import Header from '@/components/layout/Header'

export default function ThumbnailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Header />
      <main className="pt-16">
        {children}
      </main>
    </>
  )
}