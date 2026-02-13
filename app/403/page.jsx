export default function ForbiddenPage() {
  return (
    <div className="min-h-screen grid place-items-center bg-slate-950 text-slate-100 p-6">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-slate-900 p-6">
        <h1 className="text-2xl font-bold">403</h1>
        <p className="text-slate-400 mt-2">No tienes permisos para ver esta sección.</p>
      </div>
    </div>
  );
}
