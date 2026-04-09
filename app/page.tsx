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
        <div className="width-full flex flex-row items-center justify-center gap-3">
            <div className="w-[575px] h-[255px] flex flex-col justify-start items-start bg-[#171717] p-6 rounded-2xl border border-[#292929] gap-4.5">
                <div className="w-full flex flex-row items-center justify-between">
                    <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">Ce mois</p>
                    <p className="text-gold text-xs bg-[#d4a63a1a] rounded-xl px-2 py-1 font-bold text-xs">+47%</p>
                </div>
                <div className="w-full flex items-end gap-1.5">
                    {[14, 16, 14, 20, 16, 24, 28, 26, 28, 48, 54, 60].map((h, i, arr) => (
                        <div
                        key={i}
                        style={{ 
                            height: `${h}px`,
                            backgroundColor: i >= arr.length - 3 ? '#C9973A' : '#3a3020'
                        }}
                        className="rounded-md flex-1"
                        />
                    ))}
                </div>
                <p className="text-6xl font-bold">87</p>
                <p className="text-xs text-[#8c8c8c]">avis Google collectés</p>
            </div>
            <div className="w-[280px] h-[255px] flex flex-col justify-start items-start bg-[#171717] p-6 rounded-2xl border border-[#292929] gap-6">
                <div className="w-full flex flex-row justify-between items-center">
                    <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">note</p>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-gold lucide lucide-trending-up-icon lucide-trending-up"><path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/></svg>
                </div>
                <div className="flex flex-col gap-1.5">
                    {[
                        { star: 5, w: 80 },
                        { star: 4, w: 45 },
                        { star: 3, w: 7 },
                        { star: 2, w: 5 },
                        { star: 1, w: 3 },
                    ].map(({ star, w }) => (
                        <div key={star} className="flex items-center gap-2 w-[230px]">
                            <p className="text-[#8c8c8c] text-xs">{star}</p>
                            <div className="flex-1 bg-[#212021] rounded-full w-full" style={{ height: '6px' }}>
                                <div style={{ width: `${w}%`, height: '6px', backgroundColor: '#C9973A' }} className="rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
                <p className="text-3xl font-bold">4.6<span className="text-gold text-sm">★</span></p>
            </div>
            <div className="w-[280px] h-[180px] flex flex-col justify-start items-start bg-[#171717] p-6 rounded-2xl border border-[#292929] gap-6">
                <p className="text-[#8c8c8c] uppercase text-xs font-bold">Filtrés</p>
                <p className="text-5xl font-bold">14</p>
                <p className="text-xs text-[#8c8c8c]">avis négatifs privés</p>
            </div>
        </div>
      </main>
      <section className="flex flex-col justify-start items-start py-16 px-10 gap-8">
        <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">Les problèmes</p>
        <div className="flex flex-col justify-start items-start gap-2">
            <div className="flex flex-row justify-center items-center gap-2">
                <div className="w-[770px] h-[200px] flex flex-col items-start justify-start bg-[#171717] p-8 rounded-2xl border border-[#292929] gap-6">
                    <h2 className="text-4xl font-bold">Vos meilleurs clients sont <span className="text-gold">silencieux.</span></h2>
                    <p className="text-[#8c8c8c] text-sm font-light max-w-md">Votre fiche Google ne reflète pas la qualité de votre service. Vous perdez des clients au profit de concurrents avec plus d'avis.</p>
                </div>
                <div className="w-[380px] h-[200px] flex flex-col items-start justify-start bg-[#171717] p-8 rounded-2xl border border-[#292929] gap-6">
                    <span className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">Silence</span>
                    <p className="text-gold text-5xl font-bold">87%</p>
                    <span className="text-[#8c8c8c] text-xs">des clients satisfaits ne laissent jamais d'avis</span>
                </div>
            </div>
            <div className="flex flex-row justify-center items-center gap-2">
                <div className="w-[380px] h-[200px] flex flex-col items-start justify-start bg-[#171717] p-8 rounded-2xl border border-[#292929] gap-6">
                    <span className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">Influence</span>
                    <p className="text-5xl font-bold">93%</p>
                    <p className="text-[#8c8c8c] text-xs">lisent les <span className="text-gold">avis</span> avant de choisir</p>
                </div>
                <div className="w-[770px] h-[200px] flex flex-row items-center justify-between    bg-[#171717] p-8 rounded-2xl border border-[#292929] gap-6">
                    <div className="max-w-[380px] flex flex-col items-start justify-start gap-4">
                        <p className="text-5xl font-bold">3×</p>
                        <span className="text-xs text-[#8c8c8c]">plus d'avis <span className="text-gold">négatifs</span> que <span className="text-gold">positifs</span> publiés en moyenne</span>
                    </div>
                    <p className="max-w-[200px] text-[#8c8c8c] text-sm text-right">Les clients mécontents s'expriment. Les satisfaits passent à autre chose.</p>
                </div>
            </div>
        </div>
      </section>
      <section className="flex flex-col justify-start items-start py-16 px-10 gap-8">
        <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">Comment ça marche</p>
        <h2 className="text-4xl font-bold">Trois étapes. <span className="text-gold">Zéro friction.</span></h2>
        <div className="flex flex-row justify-center items-center gap-4">
            <div></div>
        </div>
      </section>
    </div>
  );
}
