import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authenticatedRequest, uploadVehiclePhoto } from '../services/api'
import { activateVehicle } from '../services/vehicle'
import { useVehicle } from '../context/VehicleContext'
import { useFipeSelection } from '../hooks/useFipeSelection'
import { useToast } from '../context/ToastContext'
import { Screen } from '../components/ui/Screen'
import { Button } from '../components/ui/Button'
import {
  Step1Identification,
  Step2Classification,
  Step3Details,
  Step4Photo,
  parseFipeYearLabel,
  type EnergyTypeValue,
  type FuelTypeValue,
  type VehicleTypeValue,
} from './vehicle/fields'

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
  const [currentKmError, setCurrentKmError] = useState(false)

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

  function handleCurrentKmChange(value: string) {
    setCurrentKm(value)
    setCurrentKmError(false)
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
      const kmInvalid = !currentKm.trim()
      const plateInvalid = licensePlate.length !== 7
      if (plateInvalid || kmInvalid) {
        setLicensePlateError(plateInvalid)
        setCurrentKmError(kmInvalid)
        return
      }
      setCurrentStep(4)
    }
  }

  function goToPreviousStep() {
    setCurrentStep((step) => Math.max(1, step - 1))
  }

  function skipLicensePlate() {
    if (!currentKm.trim()) {
      setCurrentKmError(true)
      return
    }
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
      if (showTankCapacity && tankCapacity) {
        payload.capacity = Number(tankCapacity.replace(',', '.'))
      }
      if (showBatteryCapacity && batteryCapacity) {
        payload.batteryCapacity = Number(batteryCapacity.replace(',', '.'))
      }
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

      await activateVehicle(created.id)
      await loadActiveVehicle()
      showToast('Veículo cadastrado com sucesso.', 'success')
      navigate('/')
    } catch (error) {
      console.log(error)
      showToast(error instanceof Error ? error.message : 'Erro ao cadastrar veículo')
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
      <h1 className="mb-1 text-center text-2xl font-bold text-gray-900 dark:text-gray-100">Cadastrar Veículo</h1>
      <p className="mb-4 text-center text-xs text-gray-500 dark:text-gray-400">
        <span className="text-red-600 dark:text-red-400">*</span> campo obrigatório
      </p>

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
            onCurrentKmChange={handleCurrentKmChange}
            currentKmError={currentKmError}
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

        <div className="mt-2 flex flex-col gap-3">
          {currentStep === 3 && (
            <button
              type="button"
              onClick={skipLicensePlate}
              className="text-center text-sm font-bold text-green-700 dark:text-green-400"
            >
              Preencher placa depois
            </button>
          )}

          <div className="flex gap-3">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="secondary"
                fullWidth={false}
                className="flex-1 lg:flex-none lg:px-8"
                onClick={goToPreviousStep}
              >
                Voltar
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                fullWidth={false}
                className="flex-1 lg:flex-none lg:px-8"
                onClick={() => navigate(-1)}
              >
                Cancelar
              </Button>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              fullWidth={false}
              className="flex-1 lg:flex-none lg:px-10"
            >
              {currentStep < 4 ? 'Continuar' : isSubmitting ? 'Cadastrando...' : 'Cadastrar'}
            </Button>
          </div>
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
              <div className={`h-0.5 flex-1 ${step <= currentStep ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`} />
            )}
            <div className="flex flex-col items-center gap-1 px-1">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                  isCompleted || isActive
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-gray-300 dark:border-gray-600 text-gray-500'
                }`}
              >
                {isCompleted ? '✓' : step}
              </div>
              <span
                className={`text-center text-[11px] ${
                  isCompleted || isActive ? 'font-bold text-green-700 dark:text-green-400' : 'text-gray-500'
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
