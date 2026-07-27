import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authenticatedRequest, uploadVehiclePhoto } from '../services/api'
import { useVehicle } from '../context/VehicleContext'
import { useFipeSelection } from '../hooks/useFipeSelection'
import { useToast } from '../context/ToastContext'
import { Screen } from '../components/ui/Screen'
import { TextField } from '../components/ui/TextField'
import { Button } from '../components/ui/Button'
import { SegmentedToggle } from '../components/ui/SegmentedToggle'
import type { FipeOption } from '../services/fipe'

const selectClass =
  'h-12 w-full rounded-lg border border-gray-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-60'

type VehicleTypeValue = 'Carro' | 'Moto'
type EnergyTypeValue = 'COMBUSTION' | 'ELECTRIC' | 'HYBRID'
type FuelTypeValue = 'Gasolina comum' | 'Etanol' | 'Diesel' | 'Flex' | 'GNV'

const FUEL_OPTIONS: FuelTypeValue[] = ['Gasolina comum', 'Etanol', 'Diesel', 'Flex', 'GNV']

function parseFipeYearLabel(option: FipeOption): number | null {
  const fromCode = parseInt(String(option.codigo).split('-')[0], 10)
  if (!Number.isNaN(fromCode)) return fromCode
  const fromName = parseInt(String(option.nome).slice(0, 4), 10)
  return Number.isNaN(fromName) ? null : fromName
}

function formatLicensePlateDisplay(raw: string): string {
  const isOldFormat = /^[A-Z]{3}\d{4}$/.test(raw)
  return isOldFormat ? `${raw.slice(0, 3)}-${raw.slice(3)}` : raw
}

export function VehicleNew() {
  const navigate = useNavigate()
  const { loadActiveVehicle } = useVehicle()
  const { showToast } = useToast()

  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Etapa 1 — Identificação
  const [vehicleType, setVehicleType] = useState<VehicleTypeValue>('Carro')
  const [useFipeSearch, setUseFipeSearch] = useState(true)
  const fipe = useFipeSelection(vehicleType === 'Carro' ? 'carros' : 'motos')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [manufactureYear, setManufactureYear] = useState('')
  const [modelYear, setModelYear] = useState('')
  const [brandError, setBrandError] = useState(false)
  const [modelError, setModelError] = useState(false)
  const [manufactureYearError, setManufactureYearError] = useState(false)
  const [modelYearError, setModelYearError] = useState(false)

  // Etapa 2 — Classificação
  const [energyType, setEnergyType] = useState<EnergyTypeValue>('COMBUSTION')
  const [fuelType, setFuelType] = useState<FuelTypeValue>('Flex')
  const showFuelType = energyType === 'COMBUSTION' || energyType === 'HYBRID'
  const showTankCapacity = energyType === 'COMBUSTION' || energyType === 'HYBRID'
  const showBatteryCapacity = energyType === 'ELECTRIC' || energyType === 'HYBRID'

  // Etapa 3 — Detalhes
  const [licensePlate, setLicensePlate] = useState('')
  const [color, setColor] = useState('')
  const [currentKm, setCurrentKm] = useState('')
  const [tankCapacity, setTankCapacity] = useState('')
  const [batteryCapacity, setBatteryCapacity] = useState('')
  const [licensePlateError, setLicensePlateError] = useState(false)

  // Etapa 4 — Foto (opcional)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
    }
  }, [photoPreviewUrl])

  function handleVehicleTypeChange(value: VehicleTypeValue) {
    if (value === vehicleType) return
    setVehicleType(value)
    setBrand('')
    setModel('')
    setManufactureYear('')
    setModelYear('')
    setBrandError(false)
    setModelError(false)
    setManufactureYearError(false)
    setModelYearError(false)
  }

  function handleFipeBrandSelect(code: string) {
    fipe.selectBrand(code)
    const option = fipe.brands.find((b) => String(b.codigo) === code)
    setBrand(option?.nome ?? '')
    setBrandError(false)
    setModel('')
    setModelYear('')
  }

  function handleFipeModelSelect(code: string) {
    fipe.selectModel(code)
    const option = fipe.models.find((m) => String(m.codigo) === code)
    setModel(option?.nome ?? '')
    setModelError(false)
    setModelYear('')
  }

  function handleFipeYearSelect(code: string) {
    fipe.selectYear(code)
    const option = fipe.years.find((y) => String(y.codigo) === code)
    const year = option ? parseFipeYearLabel(option) : null
    if (year) {
      setModelYear(String(year))
      setManufactureYear(String(year))
      setModelYearError(false)
      setManufactureYearError(false)
    }
  }

  function handleManufactureYearChange(value: string) {
    setManufactureYear(value.replace(/\D/g, '').slice(0, 4))
    setManufactureYearError(false)
  }

  function handleModelYearChange(value: string) {
    setModelYear(value.replace(/\D/g, '').slice(0, 4))
    setModelYearError(false)
  }

  function handleLicensePlateChange(value: string) {
    setLicensePlate(value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 7))
    setLicensePlateError(false)
  }

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setPhotoFile(file)
    setPhotoPreviewUrl(file ? URL.createObjectURL(file) : null)
  }

  function goToNextStep() {
    if (currentStep === 1) {
      const brandInvalid = !brand.trim()
      const modelInvalid = !model.trim()
      const mfYearInvalid = manufactureYear.length !== 4
      const mdYearInvalid = modelYear.length !== 4
      if (brandInvalid || modelInvalid || mfYearInvalid || mdYearInvalid) {
        setBrandError(brandInvalid)
        setModelError(modelInvalid)
        setManufactureYearError(mfYearInvalid)
        setModelYearError(mdYearInvalid)
        return
      }
      setCurrentStep(2)
      return
    }
    if (currentStep === 2) {
      setCurrentStep(3)
      return
    }
    if (currentStep === 3) {
      if (licensePlate.length !== 7) {
        setLicensePlateError(true)
        return
      }
      setCurrentStep(4)
    }
  }

  function goToPreviousStep() {
    setCurrentStep((step) => Math.max(1, step - 1))
  }

  function skipLicensePlate() {
    setLicensePlateError(false)
    setCurrentStep(4)
  }

  async function handleSubmit() {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      const payload: Record<string, unknown> = {
        type: vehicleType,
        energyType,
        currentKm: parseInt(currentKm, 10) || 0,
        brand: brand.trim(),
        model: model.trim(),
        manufactureYear: parseInt(manufactureYear, 10),
        modelYear: parseInt(modelYear, 10),
        color: color.trim() || undefined,
        licensePlate: licensePlate || undefined,
      }

      if (showFuelType) payload.fuelSubType = fuelType
      if (showTankCapacity && tankCapacity) payload.capacity = Number(tankCapacity)
      if (showBatteryCapacity && batteryCapacity) payload.batteryCapacity = Number(batteryCapacity)
      if (payload.capacity === undefined && payload.batteryCapacity !== undefined) {
        payload.capacity = payload.batteryCapacity
      }

      const created = await authenticatedRequest('/vehicles', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      if (photoFile) {
        try {
          await uploadVehiclePhoto(created.id, photoFile)
        } catch (photoError) {
          console.log(photoError)
          showToast('Veículo cadastrado, mas a foto não pôde ser enviada.')
        }
      }

      await authenticatedRequest(`/vehicles/${created.id}/active`, { method: 'PUT' })
      await loadActiveVehicle()
      showToast('Veículo cadastrado com sucesso.', 'success')
      navigate('/')
    } catch (error) {
      console.log(error)
      showToast('Erro ao cadastrar veículo')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault()
    if (currentStep < 4) {
      goToNextStep()
    } else {
      void handleSubmit()
    }
  }

  return (
    <Screen wide>
      <h1 className="mb-5 text-center text-2xl font-bold text-gray-900">Cadastrar Veículo</h1>

      <WizardStepper currentStep={currentStep} />

      <form onSubmit={handleFormSubmit} className="mt-6 flex flex-col gap-4">
        {currentStep === 1 && (
          <Step1Identification
            vehicleType={vehicleType}
            onVehicleTypeChange={handleVehicleTypeChange}
            useFipeSearch={useFipeSearch}
            onToggleManualEntry={() => setUseFipeSearch((v) => !v)}
            fipe={fipe}
            brand={brand}
            onBrandChange={(v) => {
              setBrand(v)
              setBrandError(false)
            }}
            brandError={brandError}
            model={model}
            onModelChange={(v) => {
              setModel(v)
              setModelError(false)
            }}
            modelError={modelError}
            manufactureYear={manufactureYear}
            onManufactureYearChange={handleManufactureYearChange}
            manufactureYearError={manufactureYearError}
            modelYear={modelYear}
            onModelYearChange={handleModelYearChange}
            modelYearError={modelYearError}
            onFipeBrandSelect={handleFipeBrandSelect}
            onFipeModelSelect={handleFipeModelSelect}
            onFipeYearSelect={handleFipeYearSelect}
          />
        )}

        {currentStep === 2 && (
          <Step2Classification
            energyType={energyType}
            onEnergyTypeChange={setEnergyType}
            showFuelType={showFuelType}
            fuelType={fuelType}
            onFuelTypeChange={setFuelType}
          />
        )}

        {currentStep === 3 && (
          <Step3Details
            licensePlate={licensePlate}
            onLicensePlateChange={handleLicensePlateChange}
            licensePlateError={licensePlateError}
            color={color}
            onColorChange={setColor}
            currentKm={currentKm}
            onCurrentKmChange={setCurrentKm}
            showTankCapacity={showTankCapacity}
            tankCapacity={tankCapacity}
            onTankCapacityChange={setTankCapacity}
            showBatteryCapacity={showBatteryCapacity}
            batteryCapacity={batteryCapacity}
            onBatteryCapacityChange={setBatteryCapacity}
          />
        )}

        {currentStep === 4 && (
          <Step4Photo photoPreviewUrl={photoPreviewUrl} onPhotoChange={handlePhotoChange} />
        )}

        <div className="mt-2 flex flex-col gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {currentStep < 4 ? 'Continuar' : isSubmitting ? 'Cadastrando...' : 'Cadastrar'}
          </Button>

          {currentStep === 3 && (
            <button
              type="button"
              onClick={skipLicensePlate}
              className="block w-full text-center text-sm text-green-700"
            >
              Preencher placa depois
            </button>
          )}

          {currentStep > 1 ? (
            <button
              type="button"
              onClick={goToPreviousStep}
              className="block w-full text-center text-sm text-green-700"
            >
              Voltar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="block w-full text-center text-sm text-green-700"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </Screen>
  )
}

function WizardStepper({ currentStep }: { currentStep: number }) {
  const labels = ['Identificação', 'Classificação', 'Detalhes', 'Foto']

  return (
    <div className="flex items-start">
      {labels.map((label, index) => {
        const step = index + 1
        const isCompleted = step < currentStep
        const isActive = step === currentStep

        return (
          <div key={label} className="flex flex-1 items-center">
            {index > 0 && (
              <div className={`h-0.5 flex-1 ${step <= currentStep ? 'bg-green-600' : 'bg-gray-300'}`} />
            )}
            <div className="flex flex-col items-center gap-1 px-1">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                  isCompleted || isActive
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-gray-300 text-gray-500'
                }`}
              >
                {isCompleted ? '✓' : step}
              </div>
              <span
                className={`text-center text-[11px] ${
                  isCompleted || isActive ? 'font-bold text-green-700' : 'text-gray-500'
                }`}
              >
                {label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface Step1Props {
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

function Step1Identification({
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

interface Step2Props {
  energyType: EnergyTypeValue
  onEnergyTypeChange: (value: EnergyTypeValue) => void
  showFuelType: boolean
  fuelType: FuelTypeValue
  onFuelTypeChange: (value: FuelTypeValue) => void
}

function Step2Classification({
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

interface Step3Props {
  licensePlate: string
  onLicensePlateChange: (value: string) => void
  licensePlateError: boolean
  color: string
  onColorChange: (value: string) => void
  currentKm: string
  onCurrentKmChange: (value: string) => void
  showTankCapacity: boolean
  tankCapacity: string
  onTankCapacityChange: (value: string) => void
  showBatteryCapacity: boolean
  batteryCapacity: string
  onBatteryCapacityChange: (value: string) => void
}

function Step3Details({
  licensePlate,
  onLicensePlateChange,
  licensePlateError,
  color,
  onColorChange,
  currentKm,
  onCurrentKmChange,
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

interface Step4Props {
  photoPreviewUrl: string | null
  onPhotoChange: (e: ChangeEvent<HTMLInputElement>) => void
}

function Step4Photo({ photoPreviewUrl, onPhotoChange }: Step4Props) {
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-center text-sm text-gray-600">Adicione uma foto do veículo (opcional).</p>

      <label className="flex h-40 w-40 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-gray-300 bg-gray-50">
        {photoPreviewUrl ? (
          <img src={photoPreviewUrl} alt="Foto do veículo" className="h-full w-full object-cover" />
        ) : (
          <span className="px-2 text-center text-xs text-gray-500">Escolher foto</span>
        )}
        <input type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />
      </label>
    </div>
  )
}
