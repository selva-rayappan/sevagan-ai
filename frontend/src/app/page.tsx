export default function RootPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-500 mb-6">
          <span className="text-2xl text-white font-bold">ச</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">சேவகன் Admin</h1>
        <p className="text-gray-500 mb-8">WhatsApp-First Home Services Marketplace</p>
        <a
          href="/dashboard"
          className="inline-flex items-center px-6 py-3 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}
