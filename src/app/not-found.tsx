import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <p className="text-[72px] font-bold text-[#E4E6EB] dark:text-[#2a2a2a] leading-none select-none">
        404
      </p>
      <h1 className="text-[20px] font-bold text-[#1C2B33] dark:text-[#ededed] mt-4">
        Page not found
      </h1>
      <p className="text-[14px] text-[#65676B] dark:text-[#888888] mt-2 max-w-[320px]">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-6 px-4 py-2 rounded-lg bg-[#1877F2] text-white text-[13px] font-medium hover:bg-[#166FE5] transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
