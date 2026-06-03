import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F9FC]">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-[#0D2B55]">404</h1>
        <p className="text-sm text-[#64748B] mt-2">Page not found</p>
        <Link href="/" className="mt-4 inline-block text-sm px-4 py-2 rounded-lg bg-[#1A7A4A] text-white">Go Home</Link>
      </div>
    </div>
  );
}
