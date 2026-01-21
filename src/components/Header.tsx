import { useState } from 'react'
import { Home, Menu, X, MapPin, BarChart3 } from 'lucide-react'

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <header className="p-4 flex items-center bg-white border-b border-gray-200 shadow-sm">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <Menu size={24} className="text-gray-700" />
        </button>
        <h1 className="ml-4 text-xl font-semibold">
          <a href="/" className="flex items-center gap-2 text-gray-900">
            <MapPin className="text-blue-600" size={28} />
            <span className="font-bold">ToLiveIn</span>
          </a>
        </h1>
      </header>

      <aside
        className={`fixed top-0 left-0 h-full w-80 bg-white text-gray-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold">Navigation</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <a
            href="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors mb-2"
          >
            <Home size={20} />
            <span className="font-medium">Home</span>
          </a>

          <a
            href="/cities"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors mb-2"
          >
            <BarChart3 size={20} />
            <span className="font-medium">City Rankings</span>
          </a>
        </nav>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
