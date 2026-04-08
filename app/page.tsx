import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0d0d0d]">
      <header className="flex flex-row justify-between items-center width-full py-6 px-10 bg-[#0c0c0c] border-b border-[#292929]">
        <a href="/" className="font-bold text-gold text-sm">ScanAvis</a>
        <nav className="flex flex-row gap-6">
          <a href="#" className="text-[#767676] text-sm transition-all duration-300 ease-in-out hover:text-white">Problèmes</a>
          <a href="#" className="text-[#767676] text-sm transition-all duration-300 ease-in-out hover:text-white">Résolutions</a>
          <a href="#" className="text-[#767676] text-sm transition-all duration-300 ease-in-out hover:text-white">Tarifs</a>
        </nav>
        <a href="/signup" className="text-black p-1 bg-gold text-xs font-medium rounded-xl cursor-pointer px-4 py-2">Essayer gratuitement</a>
      </header>
      <main className="flex flex-col items-center items-start justify-start py-16 px-10 gap-12">
        <div className="flex flex-row items-center gap-2">
          <div className="w-1.5 h-1.5 bg-gold rounded-full"></div>
          <p className="text-[#8c8c8c] text-xs font-medium tracking-[0.1px]">+500 commerces actifs en France</p>
        </div>
        <h1 className="max-w-[800px] text-white text-7xl font-bold tracking-[0.1px]">Chaque client satisfait mérite d'être <span className="text-gold">entendu.</span></h1>
        <p className="max-w-[600px] text-[#8c8c8c] text-xl font-sm tracking-[0.1px]">Un QR code intelligent qui filtre les avis négatifs et envoie les positifs directement sur Google.</p>
        <div className="flex flex-row items-center justify-center gap-4">
          <a href="/signup" className="flex flex-row items-center justify-center gap-1 text-black bg-gold text-xs font-medium rounded-xl cursor-pointer px-4 py-2">
            <p className="px-2 py-1">Essayer gratuitement</p>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-arrow-right-icon lucide-arrow-right"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </a>
          <p className="text-xs text-[#616161]">Sans carte · 2 min</p>
        </div>
        <div className="width-full flex flex-row items-center justify-center gap-2">
          <div className="w-[575px] h-[180px] flex flex-col justify-start items-start bg-[#171717] p-6 rounded-2xl border border-[#292929] gap-3">
            <div className="w-full flex flex-row items-center justify-between">
                <p className="text-[#8c8c8c] uppercase text-xs text-bold">Ce mois</p>
                <p className="text-gold text-xs bg-[#d4a63a1a] rounded-xl px-2 py-1 text-bold text-xs">+47%</p>
            </div>
            <p className="text-6xl font-bold">87</p>
            <p className="text-xs text-[#8c8c8c]">avis Google collectés</p>
          </div>
          <div className="w-[280px] h-[180px] flex flex-col justify-start items-start bg-[#171717] p-6 rounded-2xl border border-[#292929] gap-6">
            <p className="text-[#8c8c8c] uppercase text-xs text-bold">Note</p>
            <p className="text-5xl font-bold">4.6<span className="text-xl text-gold">★</span></p>
            <p className="text-xs text-[#8c8c8c]">avant <span>3.8</span></p>
          </div>
          <div className="w-[280px] h-[180px] flex flex-col justify-start items-start bg-[#171717] p-6 rounded-2xl border border-[#292929] gap-6">
            <p className="text-[#8c8c8c] uppercase text-xs text-bold">Filtrés</p>
            <p className="text-5xl font-bold">14</p>
            <p className="text-xs text-[#8c8c8c]">avis négatifs privés</p>
          </div>
        </div>
      </main>
    </div>
  );
}
