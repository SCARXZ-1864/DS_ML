import Link from "next/link";

// Public pages (login, signup, shared reports) have no sidebar.
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line px-6 py-4">
        <Link href="/" className="font-serif text-lg">
          Review <span className="text-accent">Intelligence</span>
        </Link>
      </header>
      {children}
    </div>
  );
}
