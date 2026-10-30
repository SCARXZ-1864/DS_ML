import Link from "next/link";

export default function ShopNotFound() {
  return (
    <div className="py-24">
      <h1 className="font-serif text-3xl">Shop not found</h1>
      <p className="mt-2 text-muted">This shop doesn&apos;t exist, or you don&apos;t have access to it.</p>
      <Link href="/" className="mt-6 inline-block border border-line px-3 py-1.5 text-sm hover:border-accent">
        Back to start
      </Link>
    </div>
  );
}
