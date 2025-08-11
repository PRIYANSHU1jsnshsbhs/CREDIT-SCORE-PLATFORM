import WalletAnalyzer from './components/WalletAnalyzer'
import BackgroundEffects from './components/BackgroundEffects'
import Header from './components/Header'

function App() {
  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <BackgroundEffects />
      <Header />
      <main className="relative z-10">
        <WalletAnalyzer />
      </main>
    </div>
  )
}

export default App
