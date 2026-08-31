import type { ChangeEvent } from 'react'
import { TextField } from '../../components/ui/TextField'
import { FieldLabel } from '../../components/ui/FieldLabel'
import { SegmentedToggle } from '../../components/ui/SegmentedToggle'
import { SearchableSelect } from '../../components/ui/SearchableSelect'
import { useFipeSelection } from '../../hooks/useFipeSelection'
import type { FipeOption } from '../../services/fipe'

function toSearchableOptions(options: FipeOption[]) {
  return options.map((o) => ({ value: String(o.codigo), label: o.nome }))
}

export type VehicleTypeValue = 'Carro' | 'Moto'
export type EnergyTypeValue = 'COMBUSTION' | 'ELECTRIC' | 'HYBRID'
export type FuelTypeValue = 'Gasolina comum' | 'Etanol' | 'Diesel' | 'Flex' | 'GNV'

export const FUEL_OPTIONS: FuelTypeValue[] = ['Gasolina comum', 'Etanol', 'Diesel', 'Flex', 'GNV']

export function parseFipeYearLabel(option: FipeOption): number | null {
  const fromCode = parseInt(String(option.codigo).split('-')[0], 10)
  if (!Number.isNaN(fromCode)) return fromCode
  const fromName = parseInt(String(option.nome).slice(0, 4), 10)
  return Number.isNaN(fromName) ? null : fromName
}

export function formatLicensePlateDisplay(raw: string): string {
  const isOldFormat = /^[A-Z]{3}\d{4}$/.test(raw)
  return isOldFormat ? `${raw.slice(0, 3)}-${raw.slice(3)}` : raw
}

export interface Step1Props {
  vehicleType: VehicleTypeValue
  onVehicleTypeChange: (value: VehicleTypeValue) => void
  useFipeSearch: boolean
  onToggleManualEntry: () => void
  fipe: ReturnType<typeof useFipeSelection>
  brand: string
  onBrandChange: (value: string) => void
  brandError: boolean
  model: string
  onModelChange: (value: string) => void
  modelError: boolean
  manufactureYear: string
  onManufactureYearChange: (value: string) => void
  manufactureYearError: boolean
  modelYear: string
  onModelYearChange: (value: string) => void
  modelYearError: boolean
  onFipeBrandSelect: (code: string) => void
  onFipeModelSelect: (code: string) => void
  onFipeYearSelect: (code: string) => void
}

export function Step1Identification({
  vehicleType,
  onVehicleTypeChange,
  useFipeSearch,
  onToggleManualEntry,
  fipe,
  brand,
  onBrandChange,
  brandError,
  model,
  onModelChange,
  modelError,
  manufactureYear,
  onManufactureYearChange,
  manufactureYearError,
  modelYear,
  onModelYearChange,
  modelYearError,
  onFipeBrandSelect,
  onFipeModelSelect,
  onFipeYearSelect,
}: Step1Props) {
  return (
    <div className="flex flex-col gap-4">
      <SegmentedToggle
        options={[
          { value: 'Carro', label: 'Carro' },
          { value: 'Moto', label: 'Moto' },
        ]}
        value={vehicleType}
        onChange={onVehicleTypeChange}
      />

      {useFipeSearch ? (
        <>
          <FieldLabel required>Marca</FieldLabel>
          {fipe.brandsError ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-3 text-sm">
              <span className="text-red-600 dark:text-red-400">Não foi possível carregar as marcas.</span>
              <button type="button" onClick={fipe.retryBrands} className="font-bold text-green-700 dark:text-green-400">
                Tentar novamente
              </button>
            </div>
          ) : (
            <SearchableSelect
              options={toSearchableOptions(fipe.brands)}
              value={fipe.brandCode}
              onChange={onFipeBrandSelect}
              placeholder="Selecione a marca"
              loading={fipe.loadingBrands}
              loadingLabel="Carregando marcas..."
            />
          )}
          {brandError && <p className="text-sm text-red-600 dark:text-red-400">Selecione a marca.</p>}

          <FieldLabel required>Modelo</FieldLabel>
          {fipe.modelsError ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-3 text-sm">
              <span className="text-red-600 dark:text-red-400">Não foi possível carregar os modelos.</span>
              <button type="button" onClick={fipe.retryModels} className="font-bold text-green-700 dark:text-green-400">
                Tentar novamente
              </button>
            </div>
          ) : (
            <SearchableSelect
              options={toSearchableOptions(fipe.models)}
              value={fipe.modelCode}
              onChange={onFipeModelSelect}
              placeholder="Selecione o modelo"
              disabled={!fipe.brandCode}
              loading={fipe.loadingModels}
              loadingLabel="Carregando modelos..."
            />
          )}
          {modelError && <p className="text-sm text-red-600 dark:text-red-400">Selecione o modelo.</p>}

          <FieldLabel required>Ano do modelo</FieldLabel>
          {fipe.yearsError ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-3 text-sm">
              <span className="text-red-600 dark:text-red-400">Não foi possível carregar os anos.</span>
              <button type="button" onClick={fipe.retryYears} className="font-bold text-green-700 dark:text-green-400">
                Tentar novamente
              </button>
            </div>
          ) : (
            <SearchableSelect
              options={toSearchableOptions(fipe.years)}
              value={fipe.yearCode}
              onChange={onFipeYearSelect}
              placeholder="Selecione o ano"
              disabled={!fipe.modelCode}
              loading={fipe.loadingYears}
              loadingLabel="Carregando anos..."
            />
          )}
          {modelYearError && <p className="text-sm text-red-600 dark:text-red-400">Ano do modelo inválido.</p>}

          <FieldLabel required>Ano de fabricação</FieldLabel>
          <TextField
            placeholder="Ano de Fabricação"
            value={manufactureYear}
            onChange={(e) => onManufactureYearChange(e.target.value)}
            inputMode="numeric"
          />
          {manufactureYearError && <p className="text-sm text-red-600 dark:text-red-400">Ano de fabricação inválido.</p>}

          <button
            type="button"
            onClick={onToggleManualEntry}
            className="text-sm font-bold text-green-700 dark:text-green-400"
          >
            Não encontrou? Preencher manualmente
          </button>
        </>
      ) : (
        <>
          <FieldLabel required>Marca</FieldLabel>
          <TextField placeholder="Marca" value={brand} onChange={(e) => onBrandChange(e.target.value)} />
          {brandError && <p className="text-sm text-red-600 dark:text-red-400">Informe a marca.</p>}

          <FieldLabel required>Modelo</FieldLabel>
          <TextField placeholder="Modelo" value={model} onChange={(e) => onModelChange(e.target.value)} />
          {modelError && <p className="text-sm text-red-600 dark:text-red-400">Informe o modelo.</p>}

          <div className="flex gap-3">
            <div className="flex-1">
              <FieldLabel required>Ano de fabricação</FieldLabel>
              <TextField
                placeholder="Ano de Fabricação"
                value={manufactureYear}
                onChange={(e) => onManufactureYearChange(e.target.value)}
                inputMode="numeric"
              />
              {manufactureYearError && <p className="text-sm text-red-600 dark:text-red-400">Inválido.</p>}
            </div>
            <div className="flex-1">
              <FieldLabel required>Ano do modelo</FieldLabel>
              <TextField
                placeholder="Ano do Modelo"
                value={modelYear}
                onChange={(e) => onModelYearChange(e.target.value)}
                inputMode="numeric"
              />
              {modelYearError && <p className="text-sm text-red-600 dark:text-red-400">Inválido.</p>}
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleManualEntry}
            className="text-sm font-bold text-green-700 dark:text-green-400"
          >
            Usar busca FIPE
          </button>
        </>
      )}
    </div>
  )
}

export interface Step2Props {
  energyType: EnergyTypeValue
  onEnergyTypeChange: (value: EnergyTypeValue) => void
  showFuelType: boolean
  fuelType: FuelTypeValue
  onFuelTypeChange: (value: FuelTypeValue) => void
}

export function Step2Classification({
  energyType,
  onEnergyTypeChange,
  showFuelType,
  fuelType,
  onFuelTypeChange,
}: Step2Props) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-2 text-sm font-bold text-gray-700 dark:text-gray-300">Tipo de energia</p>
        <SegmentedToggle
          options={[
            { value: 'COMBUSTION', label: 'Combustão' },
            { value: 'ELECTRIC', label: 'Elétrico' },
            { value: 'HYBRID', label: 'Híbrido' },
          ]}
          value={energyType}
          onChange={onEnergyTypeChange}
        />
      </div>

      {showFuelType && (
        <div>
          <p className="mb-2 text-sm font-bold text-gray-700 dark:text-gray-300">Tipo de combustível</p>
          <div className="flex flex-wrap gap-2">
            {FUEL_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onFuelTypeChange(option)}
                className={`rounded-full border px-3 py-1.5 text-sm font-bold transition-colors ${
                  fuelType === option
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export interface Step3Props {
  licensePlate: string
  onLicensePlateChange: (value: string) => void
  licensePlateError: boolean
  color: string
  onColorChange: (value: string) => void
  currentKm: string
  onCurrentKmChange: (value: string) => void
  currentKmError?: boolean
  showTankCapacity: boolean
  tankCapacity: string
  onTankCapacityChange: (value: string) => void
  showBatteryCapacity: boolean
  batteryCapacity: string
  onBatteryCapacityChange: (value: string) => void
}

export function Step3Details({
  licensePlate,
  onLicensePlateChange,
  licensePlateError,
  color,
  onColorChange,
  currentKm,
  onCurrentKmChange,
  currentKmError = false,
  showTankCapacity,
  tankCapacity,
  onTankCapacityChange,
  showBatteryCapacity,
  batteryCapacity,
  onBatteryCapacityChange,
}: Step3Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <div className="flex-1">
          <FieldLabel required>Placa</FieldLabel>
          <TextField
            placeholder="Placa (ABC1D23)"
            value={formatLicensePlateDisplay(licensePlate)}
            onChange={(e) => onLicensePlateChange(e.target.value)}
          />
          {licensePlateError && <p className="text-sm text-red-600 dark:text-red-400">Placa inválida.</p>}
        </div>
        <div className="flex-1">
          <FieldLabel>Cor</FieldLabel>
          <TextField placeholder="Cor" value={color} onChange={(e) => onColorChange(e.target.value)} />
        </div>
      </div>

      <FieldLabel required>Km atual</FieldLabel>
      <TextField
        placeholder="Km Atual"
        value={currentKm}
        onChange={(e) => onCurrentKmChange(e.target.value)}
        inputMode="numeric"
      />
      {currentKmError && <p className="text-sm text-red-600 dark:text-red-400">Informe o odômetro atual.</p>}

      {showTankCapacity && (
        <div>
          <FieldLabel>Capacidade do tanque (L)</FieldLabel>
          <TextField
            placeholder="Capacidade do tanque (L)"
            value={tankCapacity}
            onChange={(e) => onTankCapacityChange(e.target.value)}
            inputMode="decimal"
          />
        </div>
      )}

      {showBatteryCapacity && (
        <div>
          <FieldLabel>Capacidade da bateria (kWh)</FieldLabel>
          <TextField
            placeholder="Capacidade da bateria (kWh)"
            value={batteryCapacity}
            onChange={(e) => onBatteryCapacityChange(e.target.value)}
            inputMode="decimal"
          />
        </div>
      )}
    </div>
  )
}

export interface Step4Props {
  photoPreviewUrl: string | null
  existingPhotoUrl?: string | null
  onPhotoChange: (e: ChangeEvent<HTMLInputElement>) => void
}

export function Step4Photo({ photoPreviewUrl, existingPhotoUrl, onPhotoChange }: Step4Props) {
  const displayUrl = photoPreviewUrl ?? existingPhotoUrl ?? null

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-center text-sm text-gray-600 dark:text-gray-400">Adicione uma foto do veículo (opcional).</p>

      <label className="flex h-40 w-40 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
        {displayUrl ? (
          <img src={displayUrl} alt="Foto do veículo" className="h-full w-full object-cover" />
        ) : (
          <span className="px-2 text-center text-xs text-gray-500">Escolher foto</span>
        )}
        <input type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />
      </label>
    </div>
  )
}
