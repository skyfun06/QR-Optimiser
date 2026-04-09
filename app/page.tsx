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
        <div className="w-full flex flex-row items-center justify-center gap-3">
            <div className="w-[575px] h-[265px] flex flex-col justify-start items-start bg-[#171717] p-6 rounded-2xl border border-[#292929] gap-4.5">
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
                <p className="text-xs text-[#8c8c8c]">avis <span className="text-gold">Google</span> collectés</p>
            </div>
            <div className="max-w-[300px] w-full h-[265px] flex flex-col justify-start items-start bg-[#171717] p-6 rounded-2xl border border-[#292929] gap-3.5">
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
                <p className="text-4xl font-bold">4.6<span className="text-gold text-2xl">★</span></p>
                <p className="text-xs text-[#8c8c8c]">était de <span className="text-gold">3.8</span> il y a 3 mois</p>
            </div>
            <div className="max-w-[300px] w-full h-[265px] flex flex-col justify-start items-start bg-[#171717] p-6 rounded-2xl border border-[#292929] gap-6">
                <div className="w-full flex flex-row justify-between items-center">
                    <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">Filtré</p>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-gold lucide lucide-shield-check-icon lucide-shield-check"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
                </div>
                <div className="w-full flex flex-col justify-center items-start gap-2">
                    <div className="w-full flex flex-row justify-center items-center gap-2">
                        <div className="flex-1 h-[8px] bg-[#212021] rounded-full w-full">
                            <div className="w-[165px] h-[8px] bg-gold rounded-full"></div>
                        </div>
                        <p className="text-gold text-xs">86%</p>
                    </div>
                    <span className="text-xs text-[#8c8c8c]">avis positifs publiés</span>
                </div>
                <div className="flex flex-col justify-start items-start gap-2.5 mt-11.5">
                    <p className="text-4xl font-bold">14</p>
                    <p className="text-xs text-[#8c8c8c]">avis négatifs <span className="text-gold">interceptés</span> et traités en privé</p>
                </div>
            </div>
        </div>
      </main>
      <section className="flex flex-col justify-start items-start py-16 px-10 gap-8">
        <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">Les problèmes</p>
        <div className="flex flex-col justify-start items-start gap-2">
            <div className="flex flex-row justify-center items-center gap-2">
                <div className="w-[780px] h-[320px] flex flex-col items-start justify-start bg-[#171717] p-8 rounded-2xl border border-[#292929] gap-6">
                    <div className="flex flex-row justify-center items-center gap-2">
                        <div className="w-[32px] h-[32px] flex justify-center items-center bg-[#2c1b1a] rounded-xl">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-[#eb4141] lucide lucide-triangle-alert-icon lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                        </div>
                        <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">Constat</p>
                    </div>
                    <h2 className="text-6xl font-bold">Vos meilleurs clients sont <span className="text-gold">silencieux.</span></h2>
                    <p className="text-[#8c8c8c] text-sm font-light max-w-md">Votre fiche Google ne reflète pas la qualité de votre service. Vous perdez des clients au profit de concurrents <span className="text-[#eb4141]">avec plus d'avis.</span></p>
                </div>
                <div className="w-[412px] h-[320px] flex flex-col items-start justify-start bg-[#171717] p-8 rounded-2xl border border-[#292929] gap-6">
                    <div className="w-full flex flex-row justify-between items-center">
                        <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">Clien Silencieux</p>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-gold lucide lucide-message-circle-off-icon lucide-message-circle-off"><path d="m2 2 20 20"/><path d="M4.93 4.929a10 10 0 0 0-1.938 11.412 2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 0 0 11.302-1.989"/><path d="M8.35 2.69A10 10 0 0 1 21.3 15.65"/></svg>
                    </div>
                    <div className="w-full flex flex-col justify-start items-start gap-3">
                        <p className="text-gold text-6xl font-bold">87%</p>
                        <p className="text-xs text-[#8c8c8c]">de vos clients satisfaits <span className="text-gold">ne laisseront jamais d'avis</span> sans être sollicités.</p>
                        <div className="w-full flex flex-col justify-start items-center gap-1">
                            <div className="w-full h-[10px] rounded-full bg-[#8c8c8c]">
                                <div className="w-[300px] h-[10px] rounded-full bg-gold"></div>
                            </div>
                            <div className="w-full flex flex-row justify-between items-center">
                                <p className="text-gold text-xs">87% silencieux</p>
                                <p className="text-[#8c8c8c] text-xs">13% s'expriment</p>
                            </div>
                        </div>
                    </div>
                    <hr className="h-[1px] w-full text-[#262626]" />
                    <p className="text-[#8c8c8c] text-xs">Résultat : votre note stagne et ne reflète pas votre <span className="text-white">vraie qualité de service.</span></p>
                </div>
            </div>
            <div className="flex flex-row justify-center items-center gap-2">
                <div className="w-[412px] h-[320px] flex flex-col items-start justify-start bg-[#171717] p-8 rounded-2xl border border-[#292929] gap-6">
                    <div className="w-full flex flex-row justify-between items-center">
                        <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">Influence</p>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-white lucide lucide-users-icon lucide-users"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/></svg>
                    </div>
                    <div className="w-full flex flex-col justify-start items-start gap-4">
                        <p className="text-6xl font-bold">93%</p>
                        <p className="text-xs text-[#8c8c8c]">des consommateurs lisent les avis avant de choisir un commerce local.</p>
                        <div className="w-full flex flex-col justify-start items-start gap-1">
                            <div className="w-full h-[10px] rounded-full bg-[#262626]">
                                <div className="w-[300px] h-[10px] rounded-full bg-gold"></div>
                            </div>
                            <p className="text-xs text-[#8c8c8c]"><span className="text-gold">93</span> sur 100 personnes</p>
                        </div>
                        <hr className="h-[1px] w-full text-[#262626]" />
                        <p className="max-w-[80%] text-[#8c8c8c] text-xs">Sans avis récents, vous êtes <span className="text-white">invisible</span> face à la concurrence.</p>
                    </div>
                </div>
                <div className="w-[780px] h-[320px] flex flex-col items-start justify-start bg-[#171717] p-8 rounded-2xl border border-[#292929] gap-5">
                    <div className="w-full flex flex-row justify-between items-center">
                        <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">Déséquilibre</p>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-[#eb4141] lucide lucide-trending-down-icon lucide-trending-down"><path d="M16 17h6v-6"/><path d="m22 17-8.5-8.5-5 5L2 7"/></svg>
                    </div>
                    <div className="w-full flex flex-row justify-between items-end px-6">
                        <div className="flex flex-col justify-center items-center gap-2">
                            <p className="text-xs text-[#eb4141]">×3</p>
                            <div className="w-[80px] h-[100px] rounded-t-lg border border-[#652626] bg-[#4d2222]"></div>
                            <p className="text-xs text-[#8c8c8c]">Avis négatifs</p>
                        </div>
                        <div className="flex flex-col justify-center items-center gap-2">
                            <p className="text-xs text-gold">×3</p>
                            <div className="w-[80px] h-[35px] rounded-t-lg border border-[#42381f] bg-[#3d341e]"></div>
                            <p className="text-xs text-[#8c8c8c]">Avis négatifs</p>
                        </div>
                        <div className="max-w-[215px] flex flex-col justify-center items-center">
                            <p className="text-[#8c8c8c] text-sm">Les clients mécontents s'expriment <span className="text-[#eb4141]">spontanément</span>. Les satisfaits passent à autre chose.</p>
                            <span className="text-xs text-[#8c8c8c]">Sans système de collecte, votre image en ligne est biaisée.</span>
                        </div>
                    </div>
                    <hr className="h-[1px] w-full text-[#262626]" />
                    <div className="flex flex-row justify-center items-end">
                        <p className="text-4xl font-bold">3×</p>
                        <p className="text-xs text-[#8c8c8c]">plus d'avis négatifs que positifs publiés en moyenne</p>
                    </div>
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
