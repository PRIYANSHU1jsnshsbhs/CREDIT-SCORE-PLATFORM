const Header = () => {
  return (
    <header className="relative z-20 p-6">
      <div className="max-w-7xl mx-auto">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <span className="text-2xl">⚡</span>
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                OnChain Score
              </h1>
              <p className="text-sm text-gray-400 font-medium">NFT Certificate System v2.0</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-2 rounded-full">
              <span className="text-sm font-semibold text-blue-300">✨ LIVE</span>
            </div>
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          </div>
        </nav>
      </div>
    </header>
  )
}

export default Header