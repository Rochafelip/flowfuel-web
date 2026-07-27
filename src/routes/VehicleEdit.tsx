import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { uploadVehiclePhoto } from '../services/api'
import { getVehicle, updateVehicle } from '../services/vehicle'
import { useVehicle } from '../context/VehicleContext'
import { useToast } from '../context/ToastContext'
import { useFipeSelection } from '../hooks/useFipeSelection'
import { useAuthenticatedImage } from '../hooks/useAuthenticatedImage'
import type { Vehicle } from '../types/Vehicle'
import { Screen } from '../components/ui/Screen'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/ErrorState'
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

export function VehicleEdit() {
  const { id } = useParams<{ id: string }>()
  const vehicleId = Number(id)
  const navigate = useNavigate()
  const { activeVehicle, loadActiveVehicle } = useVehicle()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [existingPhotoPath, setExistingPhotoPath] = useState<string | null>(null)

  const [vehicleType, setVehicleType] = useState<VehicleTypeValue>('Carro')
  const [useFipeSearch, setUseFipeSearch] = useState(false)
  const fipe = useFipeSelection(vehicleType === 'Carro' ? 'carros' : 'motos')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [manufactureYear, setManufactureYear] = useState('')
  const [modelYear, setModelYear] = useState('')
  const [brandError, setBrandError] = useState(false)
  const [modelError, setModelError] = useState(false)
  const [manufactureYearError, setManufactureYearError] = useState(false)
  const [modelYearError, setModelYearError] = useState(false)

  const [energyType, setEnergyType] = useState<EnergyTypeValue>('COMBUSTION')
  const [fuelType, setFuelType] = useState<FuelTypeValue>('Flex')
  const showFuelType = energyType === 'COMBUSTION' || energyType === 'HYBRID'
  const showTankCapacity = energyType === 'COMBUSTION' || energyType === 'HYBRID'
  const showBatteryCapacity = energyType === 'ELECTRIC' || energyType === 'HYBRID'

  const [licensePlate, setLicensePlate] = useState('')
  const [color, setColor] = useState('')
  const [currentKm, setCurrentKm] = useState('')
  const [tankCapacity, setTankCapacity] = useState('')
  const [batteryCapacity, setBatteryCapacity] = useState('')
  const [licensePlateError, setLicensePlateError] = useState(false)
  const [currentKmError, setCurrentKmError] = useState(false)

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)

  const existingPhotoUrl = useAuthenticatedImage(existingPhotoPath)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
    }
  }, [photoPreviewUrl])

  async function load() {
    if (!id || Number.isNaN(vehicleId)) {
      setLoadError(true)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setLoadError(false)
      const vehicle = await getVehicle(vehicleId)
      populateForm(vehicle)
    } catch (err) {
      console.log(err)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  function populateForm(vehicle: Vehicle) {
    setVehicleType(vehicle.type)
    setBrand(vehicle.brand)
    setModel(vehicle.model)
    setManufactureYear(vehicle.manufactureYear ? String(vehicle.manufactureYear) : '')
    setModelYear(vehicle.modelYear ? String(vehicle.modelYear) : '')
    setEnergyType(vehicle.energyType)
    setFuelType((vehicle.fuelSubType as FuelTypeValue | null) ?? 'Flex')
    setLicensePlate(vehicle.licensePlate ?? '')
    setColor(vehicle.color ?? '')
    setCurrentKm(String(vehicle.currentKm))
    setTankCapacity(vehicle.capacity ? String(vehicle.capacity) : '')
    setBatteryCapacity(vehicle.batteryCapacity ? String(vehicle.batteryCapacity) : '')
    setExistingPhotoPath(vehicle.photo)
  }

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (isSubmitting) return

    const brandInvalid = !brand.trim()
    const modelInvalid = !model.trim()
    const mfYearInvalid = manufactureYear.length !== 4
    const mdYearInvalid = modelYear.length !== 4
    const plateInvalid = licensePlate.length !== 7
    const kmInvalid = !currentKm.trim()

    if (brandInvalid || modelInvalid || mfYearInvalid || mdYearInvalid || plateInvalid || kmInvalid) {
      setBrandError(brandInvalid)
      setModelError(modelInvalid)
      setManufactureYearError(mfYearInvalid)
      setModelYearError(mdYearInvalid)
      setLicensePlateError(plateInvalid)
      setCurrentKmError(kmInvalid)
      return
    }

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

      await updateVehicle(vehicleId, payload)

      if (photoFile) {
        try {
          await uploadVehiclePhoto(vehicleId, photoFile)
        } catch (photoError) {
          console.log(photoError)
          showToast('Veículo atualizado, mas a foto não pôde ser enviada.')
        }
      }

      if (activeVehicle?.id === vehicleId) {
        await loadActiveVehicle()
      }

      showToast('Veículo atualizado com sucesso.', 'success')
      navigate('/vehicles')
    } catch (error) {
      console.log(error)
      showToast(error instanceof Error ? error.message : 'Erro ao salvar veículo')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Screen centered>
        <Spinner />
      </Screen>
    )
  }

  if (loadError) {
    return (
      <Screen centered>
        <div className="flex flex-col items-center gap-4">
          <ErrorState message="Não foi possível carregar este veículo." />
          <Button fullWidth={false} onClick={() => navigate('/vehicles')}>
            Voltar
          </Button>
        </div>
      </Screen>
    )
  }

  return (
    <Screen wide>
      <h1 className="mb-5 text-center text-2xl font-bold text-gray-900">Editar veículo</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Identificação</h2>
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
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Classificação</h2>
          <Step2Classification
            energyType={energyType}
            onEnergyTypeChange={setEnergyType}
            showFuelType={showFuelType}
            fuelType={fuelType}
            onFuelTypeChange={setFuelType}
          />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Detalhes</h2>
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
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Foto</h2>
          <Step4Photo
            photoPreviewUrl={photoPreviewUrl}
            existingPhotoUrl={existingPhotoUrl}
            onPhotoChange={handlePhotoChange}
          />
        </section>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            fullWidth={false}
            className="flex-1 lg:flex-none lg:px-8"
            onClick={() => navigate('/vehicles')}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            fullWidth={false}
            className="flex-1 lg:flex-none lg:px-10"
          >
            {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </div>
      </form>
    </Screen>
  )
}
