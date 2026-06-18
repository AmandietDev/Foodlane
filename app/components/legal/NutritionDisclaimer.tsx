export function NutritionDisclaimer({ className = "" }: { className?: string }) {
  return (
    <details className={className}>
      <summary className="cursor-pointer text-[11px] text-[#9A7A7A] hover:text-[#7A5C5C]">
        Avertissement santé
      </summary>
      <p className="mt-2 text-[11px] leading-relaxed text-[#9A7A7A]" role="note">
        Les conseils et analyses affichés sont à titre informatif et éducatif uniquement. Foodlane ne
        constitue pas un dispositif médical et ne remplace pas l&apos;avis d&apos;un professionnel de
        santé ou d&apos;un·e diététicien·ne. En cas de pathologie, de grossesse ou de traitement
        médical, consulte un professionnel qualifié.
      </p>
    </details>
  );
}
