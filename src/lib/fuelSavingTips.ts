export const FUEL_SAVING_TIPS = [
  'Mantenha os pneus calibrados: pneus vazios podem aumentar o consumo em até 10%.',
  'Evite acelerações e frenagens bruscas — dirigir de forma suave economiza combustível.',
  'Remova peso extra do porta-malas: cada 50 kg a mais aumenta o consumo do veículo.',
  'Troque o filtro de ar regularmente para manter a eficiência do motor.',
  'Use o ar-condicionado com moderação em velocidades baixas — ele aumenta o consumo.',
  'Planeje o trajeto com antecedência para evitar trânsito e paradas desnecessárias.',
  'Desligue o motor em paradas longas em vez de deixá-lo em ponto morto.',
  'Respeite os limites de velocidade: acima de 90 km/h o consumo cresce rapidamente.',
  'Faça a manutenção preventiva em dia — um motor bem regulado consome menos.',
  'Evite rodar com o tanque quase vazio: sedimentos no fundo do tanque podem sujar o sistema de combustível.',
]

export function getTipOfTheDay(date = new Date()): string {
  const startOfYear = new Date(date.getFullYear(), 0, 1)
  const dayOfYear = Math.floor(
    (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
  )
  return FUEL_SAVING_TIPS[dayOfYear % FUEL_SAVING_TIPS.length]
}
