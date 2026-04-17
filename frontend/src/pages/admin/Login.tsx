const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export default function AdminLogin() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-sm text-center">
        <h1 className="text-2xl font-semibold text-gray-800 mb-2">工作室管理後台</h1>
        <p className="text-gray-500 text-sm mb-8">請以業主 Google 帳號登入</p>
        <a
          href={`${API_BASE}/auth/google`}
          className="flex items-center justify-center gap-3 w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-700 hover:bg-gray-50 transition font-medium"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="w-5 h-5" />
          以 Google 帳號登入
        </a>
      </div>
    </div>
  )
}
