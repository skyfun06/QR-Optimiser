import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0d0d0d]">
        <header className="fixed top-0 left-0 right-0 z-50 flex flex-row justify-between items-center width-full py-6 px-10 bg-[#0c0c0c]/80 backdrop-blur-md border-b border-[#292929]">
            <a href="/" className="font-bold text-gold text-sm transition-colors duration-200 hover:text-white">ScanAvis</a>
            <nav className="flex flex-row gap-6">
            <a href="#" className="text-[#767676] text-sm transition-colors duration-200 hover:text-white">Problèmes</a>
            <a href="#" className="text-[#767676] text-sm transition-colors duration-200 hover:text-white">Résolutions</a>
            <a href="#" className="text-[#767676] text-sm transition-colors duration-200 hover:text-white">Tarifs</a>
            </nav>
            <a href="/signup" className="text-black p-1 bg-gold text-xs font-medium rounded-xl cursor-pointer px-4 py-2 transition-colors duration-200 hover:opacity-90">Essayer gratuitement</a>
        </header>
        <main className="flex flex-col items-center items-start justify-start pt-30 pb-16 px-10 gap-12">
            <div className="flex flex-row items-center gap-2">
            <div className="w-1.5 h-1.5 bg-gold rounded-full"></div>
            <p className="text-[#8c8c8c] text-xs font-medium tracking-[0.1px]">+500 commerces actifs en France</p>
            </div>
            <h1 className="max-w-[800px] text-white text-7xl font-bold tracking-[0.1px]">Chaque client satisfait mérite d'être <span className="text-gold">entendu.</span></h1>
            <p className="max-w-[600px] text-[#8c8c8c] text-xl font-sm tracking-[0.1px]">Un QR code intelligent qui filtre les avis négatifs et envoie les positifs directement sur Google.</p>
            <div className="flex flex-row items-center justify-center gap-4">
            <a href="/signup" className="flex flex-row items-center justify-center gap-1 text-black bg-gold text-xs font-medium rounded-xl cursor-pointer px-4 py-2 transition-colors duration-200 hover:opacity-90">
                <p className="px-2 py-1">Essayer gratuitement</p>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-arrow-right-icon lucide-arrow-right"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </a>
            <p className="text-xs text-[#616161]">Sans carte · 2 min</p>
            </div>
            <div className="w-full flex flex-row items-center justify-center gap-3">
                <div className="w-[575px] h-[265px] flex flex-col justify-start items-start bg-[#171717] p-6 rounded-2xl border border-[#292929] gap-4.5">
                    <div className="w-full flex flex-row items-center justify-between">
                        <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">Ce mois</p>
                        <p className="text-gold text-xs bg-[#d4af371a] rounded-xl px-2 py-1 font-bold text-xs">+47%</p>
                    </div>
                    <div className="w-full flex items-end gap-1.5">
                        {[14, 16, 14, 20, 16, 24, 20, 18, 26, 48, 54, 60].map((h, i, arr) => (
                            <div
                            key={i}
                            style={{ 
                                height: `${h}px`,
                                backgroundColor: i >= arr.length - 3 ? '#d4af37' : '#3a3020'
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
                                    <div style={{ width: `${w}%`, height: '6px', backgroundColor: '#d4af37' }} className="rounded-full" />
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
                                <p className="text-xs text-gold">×1</p>
                                <div className="w-[80px] h-[35px] rounded-t-lg border border-[#42381f] bg-[#3d341e]"></div>
                                <p className="text-xs text-[#8c8c8c]">Avis négatifs</p>
                            </div>
                            <div className="max-w-[215px] flex flex-col justify-center items-center">
                                <p className="text-[#8c8c8c] text-sm">Les clients mécontents s'expriment <span className="text-[#eb4141]">spontanément</span>. Les satisfaits passent à autre chose.</p>
                                <span className="text-xs text-[#8c8c8c]">Sans système de collecte, votre image en ligne est biaisée.</span>
                            </div>
                        </div>
                        <hr className="h-[1px] w-full text-[#262626]" />
                        <div className="flex flex-row justify-center items-end gap-2">
                            <p className="text-4xl font-bold">3×</p>
                            <p className="text-xs text-[#8c8c8c]">plus d'avis négatifs que positifs publiés en moyenne</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
        <section className="w-full flex flex-col justify-start items-start py-16 px-10 gap-8">
            <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">Comment ça marche</p>
            <h2 className="text-4xl font-bold">Trois étapes. <span className="text-gold">Zéro friction.</span></h2>
            <div className="w-full flex flex-row justify-center items-center gap-4">
                <div className="h-[231px] w-full flex flex-col justify-start items-start bg-[#161616] rounded-2xl border border-[#292929] gap-3 p-6">
                    <div className="w-full flex flex-row justify-between items-center">
                        <div className="w-[40px] h-[40px] flex justify-center items-center bg-[#292929] rounded-xl">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-gold lucide lucide-scan-qr-code-icon lucide-scan-qr-code"><path d="M17 12v4a1 1 0 0 1-1 1h-4"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M17 8V7"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M7 17h.01"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="5" height="5" rx="1"/></svg>
                        </div>
                        <p className="text-2xl text-[#292929] font-bold">01</p>
                    </div>
                    <div className="flex flex-col justif-start items-start">
                        <p className="text-2xl font-bold">Scan</p>
                        <p className="text-[#8c8c8c] text-sm">Le client <span className="text-gold">scanne le QR</span> code depuis sa table, le comptoir ou le ticket.</p>
                    </div>
                    <div className="w-full flex flex-row justify-start items-center gap-2">
                        <div className="w-[48px] h-[48px] flex justify-center items-center rounded-xl border border-[#252424]">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-gold lucide lucide-qr-code-icon lucide-qr-code"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-[#8c8c8c] lucide lucide-arrow-right-icon lucide-arrow-right"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                        <div className="flex flex-col justify-start items-start">
                            <p className="text-[10px]">scanavi.co/resto</p>
                            <p className="text-[10px] text-[#8c8c8c]">Ouvre instatanément la page</p>
                        </div>
                    </div>
                </div>
                <div className="h-[231px] w-full flex flex-col justify-start items-start bg-[#161616] rounded-2xl border border-[#292929] gap-3 p-6">
                    <div className="w-full flex flex-row justify-between items-center">
                        <div className="w-[40px] h-[40px] flex justify-center items-center bg-[#292929] rounded-xl">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-gold lucide lucide-star-icon lucide-star"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/></svg>
                        </div>
                        <p className="text-2xl text-[#292929] font-bold">02</p>
                    </div>
                    <div className="flex flex-col justif-start items-start">
                        <p className="text-2xl font-bold">Note</p>
                        <p className="text-[#8c8c8c] text-sm">Il donne une note de <span className="text-gold">1 à 5 étoiles.</span> Une seconde, pas plus.</p>
                    </div>
                    <div className="flex flex-row justify-start items-center gap-2">
                        <p className="text-gold text-2xl">★ ★ ★ ★ <span className="text-[#292929]">★</span></p>
                    </div>
                </div>
                <div className="h-[231px] w-full flex flex-col justify-start items-start bg-[#161616] rounded-2xl border border-[#292929] gap-3 p-6">
                    <div className="w-full flex flex-row justify-between items-center">
                        <div className="w-[40px] h-[40px] flex justify-center items-center bg-[#292929] rounded-xl">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-gold lucide lucide-funnel-icon lucide-funnel"><path d="M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z"/></svg>
                        </div>
                        <p className="text-2xl text-[#292929] font-bold">03</p>
                    </div>
                    <div className="flex flex-col justif-start items-start">
                        <p className="text-2xl font-bold">Filtre</p>
                        <p className="text-[#8c8c8c] text-sm"><span className="text-gold">4-5★</span> → avis Google. <span className="text-gold">1-3★</span> → retour privé. Votre note est protégée.</p>
                    </div>
                    <div className="flex flex-col justify-start items-start gap-2">
                        <div className="flex flex-row justify-start items-center gap-2">
                            <p className="text-[10px] text-gold bg-[#2a251a] px-1 py-0.5 rounded-sm">4-5★</p>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-[#8c8c8c] lucide lucide-arrow-right-icon lucide-arrow-right"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                            <p className="text-[10px]">Google</p>
                        </div>
                        <div className="flex flex-row justify-start items-center gap-2">
                            <p className="text-[10px] text-[#8b8b8b] bg-[#212121] px-[5px] py-0.5 rounded-sm">1-3★</p>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-[#8c8c8c] lucide lucide-arrow-right-icon lucide-arrow-right"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                            <p className="text-[10px] text-[#ceccc7]">Privé</p>
                        </div>
                    </div>
                </div>
            </div>
            <p className="w-full text-xs text-[#8c8c8c] text-center">Installation en 2 minutes · Aucune compétence technique nécessaire</p>
        </section>
        <section className="w-full flex flex-col justify-start items-start py-16 px-10 gap-8">
            <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">Les Résultats</p>
            <h2 className="text-4xl font-bold">Rentable dès le <span className="text-gold">2e client.</span></h2>
            <div className="w-full flex flex-col justify-start items-start gap-2">
                <div className="w-full flex flex-row justify-start items-start gap-2">
                    <div className="w-full flex flex-col items-start justify-start bg-[#171717] p-8 rounded-2xl border border-[#292929] gap-6">
                        <div className="w-full flex flex-row justify-between items-center">
                            <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">ROI</p>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-gold lucide lucide-trending-up-icon lucide-trending-up"><path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/></svg>
                        </div>
                        <div className="w-full flex flex-col justify-start items-start gap-2">
                            <div className="w-full flex flex-row justify-between items-center">
                                <p className="text-[#8c8c8c] text-[10px]">Coût</p>
                                <p className="text-xs">29€/mois</p>
                            </div>
                            <div className="w-full h-[8px] bg-[#202121] rounded-full">
                                <div className="w-[80px] h-[8px] bg-[#873232] rounded-full"></div>
                            </div>
                            <div className="w-full flex flex-row justify-between items-center">
                                <p className="text-[#8c8c8c] text-[10px]">Revenu généré</p>
                                <p className="text-xs">min 200€/mois</p>
                            </div>
                            <div className="w-full h-[8px] bg-[#202121] rounded-full">
                                <div className="w-[700px] h-[8px] bg-gold rounded-full"></div>
                            </div>
                        </div>
                        <h2 className="max-w-[500px] text-4xl font-bold">Un nouveau client = ~40€. <br></br><span className="text-gold">2 clients = abonnement remboursé.</span></h2>
                        <p className="text-xs text-[#8c8c8c]">* La plupart de nos utilisateurs gagnent bien plus que 2 clients/mois.</p>
                    </div>
                    <div className="w-[450px] h-[361px] flex flex-col items-start justify-start bg-[#171717] p-8 rounded-2xl border border-[#292929] gap-6">
                        <div className="w-full flex flex-row justify-between items-center">
                            <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">Visites</p>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-gold lucide lucide-eye-icon lucide-eye"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
                        </div>
                        <div className="w-full flex flex-col gap-2">
                            {[
                                { day: 'Lun', w: 55 },
                                { day: 'Mar', w: 45 },
                                { day: 'Mer', w: 50 },
                                { day: 'Jeu', w: 60 },
                                { day: 'Ven', w: 65 },
                                { day: 'Sam', w: 80 },
                                { day: 'Dim', w: 70 },
                            ].map(({ day, w }) => (
                                <div key={day} className="flex items-center gap-3">
                                    <p className="text-[#8c8c8c] text-xs w-6">{day}</p>
                                    <div className="flex-1 rounded-full" style={{ height: '6px', backgroundColor: '#212121' }}>
                                        <div style={{ width: `${w}%`, height: '6px', backgroundColor: '#d4af37', display: 'block' }} className="rounded-full" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="w-full flex flex-col justify-start items-start gap-1">
                            <p className="text-4xl font-bold">+34%</p>
                            <p className="text-[#8c8c8c] text-xs"><span className="text-gold">visites</span> sur votre fiche Google</p>
                        </div>
                    </div>
                </div>
                <div className="w-full flex flex-row justify-start items-start gap-2">
                    <div className="w-full flex flex-col items-start justify-start bg-[#171717] p-8 rounded-2xl border border-[#292929] gap-6">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-gold lucide lucide-quote-icon lucide-quote"><path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/><path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/></svg>
                        <h3 className="text-xl">"On est passé de 12 à 87 avis en 3 mois. Notre note est montée de 3.8 à 4.6. Les clients nous trouvent plus facilement sur Google."</h3>
                        <div className="flex flex-row justify-start items-start gap-2">
                            <div className="flex justify-center items-center bg-[#212121] rounded-full p-2">
                                <p className="text-gold font-bold text-sm">ML</p>
                            </div>
                            <div className="flex flex-col justify-start items-start gap-1">
                                <p className="text-xs">Marie L.</p>
                                <p className="text-[10px] text-[#8c8c8c]">Restaurant Le Comptoir, Lyon</p>
                            </div>
                        </div>
                    </div>
                    <div className="w-full flex flex-col items-start justify-start bg-[#171717] p-8 rounded-2xl border border-[#292929] gap-6">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-gold lucide lucide-quote-icon lucide-quote"><path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/><path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/></svg>
                        <h3 className="text-xl">"Installé en 5 minutes. Les avis tombent tout seuls maintenant. On a doublé notre nombre d'avis en un mois."</h3>
                        <div className="flex flex-row justify-start items-start gap-2">
                            <div className="flex justify-center items-center bg-[#212121] rounded-full p-2">
                                <p className="text-gold font-bold text-sm">TR</p>
                            </div>
                            <div className="flex flex-col justify-start items-start gap-1">
                                <p className="text-xs">Thomas R.</p>
                                <p className="text-[10px] text-[#8c8c8c]">Salon Figaro, Paris 11e</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
        <section className="w-full flex flex-col justify-start items-start py-16 px-10 gap-8">
            <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">Nos Tarifs</p>
            <h2 className="text-4xl font-bold">Simple. <span className="text-gold">Transparent.</span></h2>
            <div className="w-full flex flex-row justify-start items-start gap-4">
                <div className="w-[330px] flex flex-col justify-start items-start p-8 bg-[#171717] rounded-2xl border border-[#292929] gap-8">
                    <p className="text-[#8c8c8c] uppercase text-xs font-bold tracking-[1px]">Gratuit</p>
                    <div className="flex flex-col justify-start items-start gap-2">
                        <h3 className="text-4xl font-bold">0€</h3>
                        <p className="text-[#8c8c8c] text-xs">Sans engagement</p>
                    </div>
                    <div className="w-full flex flex-col justify-start items-start gap-2">
                        <div className="flex flex-row justify-start items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-[#424242] lucide lucide-check-icon lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
                            <p className="text text-[#8c8c8c] text-sm">1 QR code</p>
                        </div>
                        <div className="flex flex-row justify-start items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-[#424242] lucide lucide-check-icon lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
                            <p className="text text-[#8c8c8c] text-sm">25 scans / mois</p>
                        </div>
                        <div className="flex flex-row justify-start items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-[#424242] lucide lucide-check-icon lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
                            <p className="text text-[#8c8c8c] text-sm">Redirection Google</p>
                        </div>
                        <div className="flex flex-row justify-start items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-[#424242] lucide lucide-check-icon lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
                            <p className="text text-[#8c8c8c] text-sm">Feedback privé</p>
                        </div>
                        <div className="flex flex-row justify-start items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-[#424242] lucide lucide-check-icon lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
                            <p className="text text-[#8c8c8c] text-sm">Stats de base</p>
                        </div>
                    </div>
                    <a href="#" className="w-full flex flex-row justify-center items-center text-sm gap-2 font-medium py-2 border border-[#292929] rounded-xl mt-[59px] transition-colors duration-200 hover:bg-gold hover:text-black hover:border-gold">
                        Commencer
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-arrow-right-icon lucide-arrow-right"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </a>
                </div>
                <div className="w-[330px] flex flex-col justify-start items-start p-8 bg-[#171717] rounded-2xl border border-[#292929] gap-8">
                    <div className="w-full flex flex-row justify-between items-center">
                        <p className="text-gold uppercase text-xs font-bold tracking-[1px]">Gratuit</p>
                        <span className="text-[#0d0d0d] py-0.5 px-2 bg-gold rounded-full text-[10px]">Populaire</span>
                    </div>
                    <div className="flex flex-col justify-start items-start gap-2">
                        <h3 className="text-4xl font-bold">19€<span className="text-sm text-[#8c8c8c] font-light">/mois</span></h3>
                        <p className="text-[#8c8c8c] text-xs">Annulez quand vous voulez</p>
                    </div>
                    <div className="w-full flex flex-col justify-start items-start gap-2">
                        <div className="flex flex-row justify-start items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-gold lucide lucide-check-icon lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
                            <p className="text-sm">QR codes illimités</p>
                        </div>
                        <div className="flex flex-row justify-start items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-gold lucide lucide-check-icon lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
                            <p className="text-sm">Scans illimités</p>
                        </div>
                        <div className="flex flex-row justify-start items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-gold lucide lucide-check-icon lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
                            <p className="text-sm">Dashboard avancé</p>
                        </div>
                        <div className="flex flex-row justify-start items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-gold lucide lucide-check-icon lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
                            <p className="text-sm">Alertes temps réel</p>
                        </div>
                        <div className="flex flex-row justify-start items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-gold lucide lucide-check-icon lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
                            <p className="text-sm">Customisation du QR code</p>
                        </div>
                        <div className="flex flex-row justify-start items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-gold lucide lucide-check-icon lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
                            <p className="text-sm">Export données</p>
                        </div>
                        <div className="flex flex-row justify-start items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-gold lucide lucide-check-icon lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
                            <p className="text-sm">Support prioritaire</p>
                        </div>
                    </div>
                    <a href="#" className="w-full flex flex-row justify-center items-center text-sm text-[#0d0d0d] font-medium gap-2 bg-gold py-2 border border-gold rounded-xl transition-colors duration-200 hover:opacity-90">
                        Essaie gratuit 14 jours
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-arrow-right-icon lucide-arrow-right"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </a>
                </div>
            </div>
        </section>
        <section className="relative w-full flex justify-center items-center py-16 px-10 ">
            <div
                className="relative w-full overflow-hidden rounded-2xl border border-[#292929]"
                style={{
                    background:
                        "radial-gradient(ellipse at center, #2a1f00 0%, #1a1200 40%, #0d0d0d 100%)",
                }}
            >
                <svg
                    className="pointer-events-none absolute inset-0 z-0 h-full w-full"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden
                >
                    <defs>
                        <pattern
                            id="cta-diamond-grid"
                            width="60"
                            height="60"
                            patternUnits="userSpaceOnUse"
                        >
                            <path
                                d="M 20 0 L 40 20 L 20 40 L 0 20 Z"
                                fill="none"
                                stroke="rgba(201, 151, 58, 0.15)"
                                strokeWidth="0.5"
                            />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#cta-diamond-grid)" />
                </svg>
                <div className="relative z-10 flex w-full flex-col items-center justify-center py-16 px-8 text-center">
                    <p className="text-xs uppercase tracking-widest text-gold">COMMENCER</p>
                    <h2 className="mt-4 text-5xl font-bold text-white">Prêt à obtenir plus d'avis ?</h2>
                    <p className="mt-4 text-lg font-light text-[#8c8c8c]">Installez votre QR code en moins de 5 minutes. Gratuit pour commencer.</p>
                    <a href="/signup" className="mt-8 rounded-xl border border-gold px-8 py-4 font-semibold text-gold transition-colors duration-200 hover:bg-gold hover:text-black hover:border-gold">Commencer gratuitement</a>
                    <p className="mt-4 text-xs text-[#555]">Sans carte bancaire · Résultats en 48h</p>
                </div>
            </div>
        </section>
        <footer className=" w-full p-10 flex flex-col justify-start items-start gap-8 border-t border-t-[#292929]">
                <div className="w-full flex flex-row justify-start items-start gap-64">
                    <div className="flex flex-col justify-start items-start gap-4">
                        <p className="text-sm text-gold font-bold uppercase tracking-[1px]">NavBar</p>
                        <div className="flex flex-col justify-start items-start gap-3">
                            <a href="#" className="text-[#8c8c8c] text-sm transition-colors duration-200 hover:text-white">Problèmes</a>
                            <a href="#" className="text-[#8c8c8c] text-sm transition-colors duration-200 hover:text-white">Résolutions</a>
                            <a href="#" className="text-[#8c8c8c] text-sm transition-colors duration-200 hover:text-white">Résultats</a>
                            <a href="#" className="text-[#8c8c8c] text-sm transition-colors duration-200 hover:text-white">Tarifs</a>
                        </div>
                    </div>
                    <div className="flex flex-col justify-start items-start gap-4">
                        <p className="text-sm text-gold font-bold uppercase tracking-[1px]">Entreprise</p>
                        <div className="flex flex-col justify-start items-start gap-3">
                            <a href="#" className="text-[#8c8c8c] text-sm transition-colors duration-200 hover:text-white">À propos</a>
                            <a href="#" className="text-[#8c8c8c] text-sm transition-colors duration-200 hover:text-white">Contact</a>
                        </div>
                    </div>
                    <div className="flex flex-col justify-start items-start gap-4">
                        <p className="text-sm text-gold font-bold uppercase tracking-[1px]">Légal</p>
                        <div className="flex flex-col justify-start items-start gap-3">
                            <a href="#" className="text-[#8c8c8c] text-sm transition-colors duration-200 hover:text-white">Mentions légales</a>
                            <a href="#" className="text-[#8c8c8c] text-sm transition-colors duration-200 hover:text-white">CGU</a>
                            <a href="#" className="text-[#8c8c8c] text-sm transition-colors duration-200 hover:text-white">Confidentialité</a>
                        </div>
                    </div>
                </div>
                <hr className="h-[1px] w-full text-[#262626]" />
                <p className="text-xs text-[#8c8c8c] text-left">© 2026 ScanAvis · Fait en France</p>
        </footer>
    </div>
  );
}
