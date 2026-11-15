
export default function StatCard({
  title,
  value,
  icon: Icon,
  color = "bg-green-50 text-green-700"
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{title}</p>
        <div className={`rounded-lg p-3 ${color}`}>
          <Icon size={21} />
        </div>
      </div>
      <h2 className="mt-4 text-2xl font-bold text-gray-900">
        {value}
      </h2>
    </div>
  );
}
