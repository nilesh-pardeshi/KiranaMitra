
export default function Loader({ text = "Loading..." }) {
  return (
    <div className="flex min-h-40 items-center justify-center gap-3 text-gray-500">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
      <span className="text-sm">{text}</span>
    </div>
  );
}
