import { useState } from 'react'
import { Screen } from '../components/ui/Screen'
import { Card } from '../components/ui/Card'
import { FieldLabel } from '../components/ui/FieldLabel'
import { TextField } from '../components/ui/TextField'
import { SegmentedToggle } from '../components/ui/SegmentedToggle'
import { exactCost, parseDecimal, ratioRule, type FuelWinner } from '../lib/flexFuel'

type Mode = 'RATIO' | 'EXACT'

const brl = (value: number, digits = 2) =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })

function winnerTitle(winner: FuelWinner) {
  if (winner === 'ethanol') return 'Abasteça com etanol'
  if (winner === 'gasoline') return 'Abasteça com gasolina'
  return 'Tanto faz'
}

function NumberField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  const invalid = value.trim() !== '' && parseDecimal(value) === null
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <TextField
        id={id}
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
      />
      {invalid && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">Informe um número maior que zero</p>
      )}
    </div>
  )
}

export function FlexCalculator() {
  const [mode, setMode] = useState<Mode>('RATIO')
  const [ethanolPrice, setEthanolPrice] = useState('')
  const [gasolinePrice, setGasolinePrice] = useState('')
  const [ethanolKm, setEthanolKm] = useState('')
  const [gasolineKm, setGasolineKm] = useState('')

  const ethanolPriceValue = parseDecimal(ethanolPrice)
  const gasolinePriceValue = parseDecimal(gasolinePrice)
  const ethanolKmValue = parseDecimal(ethanolKm)
  const gasolineKmValue = parseDecimal(gasolineKm)

  let result: { title: string; lines: string[] } | null = null

  if (ethanolPriceValue !== null && gasolinePriceValue !== null) {
    if (mode === 'RATIO') {
      const { ratio, winner } = ratioRule(ethanolPriceValue, gasolinePriceValue)
      result = {
        title: winnerTitle(winner),
        lines: [`O etanol custa ${brl(ratio * 100, 1)}% do preço da gasolina (limite: 70%)`],
      }
    } else if (ethanolKmValue !== null && gasolineKmValue !== null) {
      const cost = exactCost({
        ethanolPrice: ethanolPriceValue,
        gasolinePrice: gasolinePriceValue,
        ethanolKmPerLiter: ethanolKmValue,
        gasolineKmPerLiter: gasolineKmValue,
      })
      const lines = [
        `Etanol: R$ ${brl(cost.ethanolCostPerKm, 3)} por km`,
        `Gasolina: R$ ${brl(cost.gasolineCostPerKm, 3)} por km`,
      ]
      if (cost.winner !== 'tie') {
        lines.push(`Economia de ${brl(cost.savingsPercent, 1)}% por km`)
      }
      result = { title: winnerTitle(cost.winner), lines }
    }
  }

  return (
    <Screen>
      <h1 className="mb-5 text-xl font-bold text-gray-900 dark:text-gray-100">Calculadora flex</h1>

      <div className="flex flex-col gap-4">
        <SegmentedToggle
          value={mode}
          onChange={setMode}
          options={[
            { value: 'RATIO', label: 'Regra dos 70%' },
            { value: 'EXACT', label: 'Cálculo exato' },
          ]}
        />

        <NumberField id="ethanol-price" label="Preço do etanol (R$/litro)" placeholder="Ex.: 4,29" value={ethanolPrice} onChange={setEthanolPrice} />
        <NumberField id="gasoline-price" label="Preço da gasolina (R$/litro)" placeholder="Ex.: 6,19" value={gasolinePrice} onChange={setGasolinePrice} />

        {mode === 'EXACT' && (
          <>
            <NumberField id="ethanol-km" label="Consumo com etanol (km/l)" placeholder="Ex.: 8,5" value={ethanolKm} onChange={setEthanolKm} />
            <NumberField id="gasoline-km" label="Consumo com gasolina (km/l)" placeholder="Ex.: 12" value={gasolineKm} onChange={setGasolineKm} />
          </>
        )}

        {result && (
          <Card className="p-4">
            <p className="text-lg font-bold text-green-700 dark:text-green-400">{result.title}</p>
            {result.lines.map((line) => (
              <p key={line} className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {line}
              </p>
            ))}
          </Card>
        )}
      </div>
    </Screen>
  )
}
