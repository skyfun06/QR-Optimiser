export default function ConfirmedPage() {
  return (
    <div className="w-full h-[100vh] flex flex-col justify-center items-center gap-4">
      <div className="w-[400px] flex flex-col justify-center items-center gap-5 p-8 bg-[#171717] border border-[#292929] rounded-2xl text-center">
        <span className="text-5xl">✅</span>
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-xl font-bold text-white">Email vérifié</h2>
          <p className="text-sm text-[#8c8c8c]">
            Votre adresse email a bien été confirmée.
            Vous pouvez fermer cet onglet.
          </p>
        </div>
        <a href="/login" className="text-sm text-gold hover:underline">
          Se connecter à votre compte
        </a>
      </div>
      <p className="text-xs text-[#8c8c8c]">Propulsé par <span className="text-gold">ScanAvis</span></p>
    </div>
  )
}
