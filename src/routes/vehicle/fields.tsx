import type { ChangeEvent } from 'react'
import { TextField } from '../../components/ui/TextField'
import { SegmentedToggle } from '../../components/ui/SegmentedToggle'
import { useFipeSelection } from '../../hooks/useFipeSelection'
import type { FipeOption } from '../../services/fipe'

export const selectClass =
  'h-12 w-full rounded-lg border border-gray-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-60'

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
          {fipe.brandsError ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-300 px-3 py-3 text-sm">
              <span>Não foi possível carregar as marcas.</span>
              <button type="button" onClick={fipe.retryBrands} className="font-bold text-green-700">
                Tentar novamente
              </button>
            </div>
          ) : (
            <select
              className={selectClass}
              value={fipe.brandCode}
              onChange={(e) => onFipeBrandSelect(e.target.value)}
              disabled={fipe.loadingBrands}
            >
              <option value="">
                {fipe.loadingBrands ? 'Carregando marcas...' : 'Selecione a marca'}
              </option>
              {fipe.brands.map((b) => (
                <option key={b.codigo} value={String(b.codigo)}>
                  {b.nome}
                </option>
              ))}
            </select>
          )}
          {brandError && <p className="text-sm text-red-600">Selecione a marca.</p>}

          {fipe.modelsError ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-300 px-3 py-3 text-sm">
              <span>Não foi possível carregar os modelos.</span>
              <button type="button" onClick={fipe.retryModels} className="font-bold text-green-700">
                Tentar novamente
              </button>
            </div>
          ) : (
            <select
              className={selectClass}
              value={fipe.modelCode}
              onChange={(e) => onFipeModelSelect(e.target.value)}
              disabled={!fipe.brandCode || fipe.loadingModels}
            >
              <option value="">
                {fipe.loadingModels ? 'Carregando modelos...' : 'Selecione o modelo'}
              </option>
              {fipe.models.map((m) => (
                <option key={m.codigo} value={String(m.codigo)}>
                  {m.nome}
                </option>
              ))}
            </select>
          )}
          {modelError && <p className="text-sm text-red-600">Selecione o modelo.</p>}

          {fipe.yearsError ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-300 px-3 py-3 text-sm">
              <span>Não foi possível carregar os anos.</span>
              <button type="button" onClick={fipe.retryYears} className="font-bold text-green-700">
                Tentar novamente
              </button>
            </div>
          ) : (
            <select
              className={selectClass}
              value={fipe.yearCode}
              onChange={(e) => onFipeYearSelect(e.target.value)}
              disabled={!fipe.modelCode || fipe.loadingYears}
            >
              <option value="">{fipe.loadingYears ? 'Carregando anos...' : 'Selecione o ano'}</option>
              {fipe.years.map((y) => (
                <option key={y.codigo} value={String(y.codigo)}>
                  {y.nome}
                </option>
              ))}
            </select>
          )}
          {modelYearError && <p className="text-sm text-red-600">Ano do modelo inválido.</p>}

          <TextField
            placeholder="Ano de Fabricação"
            value={manufactureYear}
            onChange={(e) => onManufactureYearChange(e.target.value)}
            inputMode="numeric"
          />
          {manufactureYearError && <p className="text-sm text-red-600">Ano de fabricação inválido.</p>}

          <button
            type="button"
            onClick={onToggleManualEntry}
            className="text-sm font-bold text-green-700"
          >
            Não encontrou? Preencher manualmente
          </button>
        </>
      ) : (
        <>
          <TextField placeholder="Marca" value={brand} onChange={(e) => onBrandChange(e.target.value)} />
          {brandError && <p className="text-sm text-red-600">Informe a marca.</p>}

          <TextField placeholder="Modelo" value={model} onChange={(e) => onModelChange(e.target.value)} />
          {modelError && <p className="text-sm text-red-600">Informe o modelo.</p>}

          <div className="flex gap-3">
            <div className="flex-1">
              <TextField
                placeholder="Ano de Fabricação"
                value={manufactureYear}
                onChange={(e) => onManufactureYearChange(e.target.value)}
                inputMode="numeric"
              />
              {manufactureYearError && <p className="text-sm text-red-600">Inválido.</p>}
            </div>
            <div className="flex-1">
              <TextField
                placeholder="Ano do Modelo"
                value={modelYear}
                onChange={(e) => onModelYearChange(e.target.value)}
                inputMode="numeric"
              />
              {modelYearError && <p className="text-sm text-red-600">Inválido.</p>}
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleManualEntry}
            className="text-sm font-bold text-green-700"
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
        <p className="mb-2 text-sm font-bold text-gray-700">Tipo de energia</p>
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
          <p className="mb-2 text-sm font-bold text-gray-700">Tipo de combustível</p>
          <div className="flex flex-wrap gap-2">
            {FUEL_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onFuelTypeChange(option)}
                className={`rounded-full border px-3 py-1.5 text-sm font-bold transition-colors ${
                  fuelType === option
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-gray-300 text-gray-600'
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
          <TextField
            placeholder="Placa (ABC1D23)"
            value={formatLicensePlateDisplay(licensePlate)}
            onChange={(e) => onLicensePlateChange(e.target.value)}
          />
          {licensePlateError && <p className="text-sm text-red-600">Placa inválida.</p>}
        </div>
        <div className="flex-1">
          <TextField placeholder="Cor" value={color} onChange={(e) => onColorChange(e.target.value)} />
        </div>
      </div>

      <TextField
        placeholder="Km Atual"
        value={currentKm}
        onChange={(e) => onCurrentKmChange(e.target.value)}
        inputMode="numeric"
      />
      {currentKmError && <p className="text-sm text-red-600">Informe o odômetro atual.</p>}

      {showTankCapacity && (
        <TextField
          placeholder="Capacidade do tanque (L)"
          value={tankCapacity}
          onChange={(e) => onTankCapacityChange(e.target.value)}
          inputMode="decimal"
        />
      )}

      {showBatteryCapacity && (
        <TextField
          placeholder="Capacidade da bateria (kWh)"
          value={batteryCapacity}
          onChange={(e) => onBatteryCapacityChange(e.target.value)}
          inputMode="decimal"
        />
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
      <p className="text-center text-sm text-gray-600">Adicione uma foto do veículo (opcional).</p>

      <label className="flex h-40 w-40 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-gray-300 bg-gray-50">
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
