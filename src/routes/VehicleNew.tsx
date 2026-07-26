import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authenticatedRequest } from '../services/api'
import { useVehicle } from '../context/VehicleContext'
import { useFipeSelection } from '../hooks/useFipeSelection'
import { useToast } from '../context/ToastContext'
import { Screen } from '../components/ui/Screen'
import { TextField } from '../components/ui/TextField'
import { Button } from '../components/ui/Button'

const selectClass =
  'h-12 w-full rounded-lg border border-gray-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-60'

export function VehicleNew() {
  const fipe = useFipeSelection()

  const [manufactureYear, setManufactureYear] = useState('')
  const [type, setType] = useState('Carro')
  const [energyType, setEnergyType] = useState('COMBUSTION')
  const [fuelSubType, setFuelSubType] = useState('Gasolina')
  const [capacity, setCapacity] = useState('')
  const [color, setColor] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [currentKm, setCurrentKm] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { loadActiveVehicle } = useVehicle()
  const { showToast } = useToast()

  async function handleCreateVehicle(e: FormEvent) {
    e.preventDefault()

    if (
      !fipe.brandName ||
      !fipe.modelName ||
      !fipe.modelYear ||
      !manufactureYear ||
      !licensePlate ||
      !currentKm ||
      !capacity
    ) {
      showToast('Preencha todos os campos')
      return
    }

    try {
      setLoading(true)
      const response = await authenticatedRequest('/vehicles', {
        method: 'POST',
        body: JSON.stringify({
          type,
          energyType,
          fuelSubType,
          currentKm: parseInt(currentKm),
          capacity: parseInt(capacity),
          brand: fipe.brandName,
          model: fipe.modelName,
          manufactureYear: parseInt(manufactureYear),
          modelYear: fipe.modelYear,
          color,
          licensePlate,
        }),
      })

      if (response) {
        await authenticatedRequest(`/vehicles/${response.id}/active`, {
          method: 'PUT',
        })

        await loadActiveVehicle()
        showToast('Veículo cadastrado com sucesso.', 'success')
        navigate('/')
      }
    } catch (error) {
      console.log(error)
      showToast('Erro ao cadastrar veículo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen wide>
      <h1 className="mb-5 text-center text-2xl font-bold text-gray-900">
        Cadastrar Veículo
      </h1>

      <form onSubmit={handleCreateVehicle} className="flex flex-col gap-4">
        {fipe.brandsError ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-300 px-3 py-3 text-sm">
            <span>Não foi possível carregar as marcas.</span>
            <button
              type="button"
              onClick={fipe.retryBrands}
              className="font-bold text-green-700"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <select
            className={selectClass}
            value={fipe.brandCode}
            onChange={(e) => fipe.selectBrand(e.target.value)}
            disabled={fipe.loadingBrands}
          >
            <option value="">
              {fipe.loadingBrands ? 'Carregando marcas...' : 'Selecione a marca'}
            </option>
            {fipe.brands.map((brand) => (
              <option key={brand.codigo} value={String(brand.codigo)}>
                {brand.nome}
              </option>
            ))}
          </select>
        )}

        {fipe.modelsError ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-300 px-3 py-3 text-sm">
            <span>Não foi possível carregar os modelos.</span>
            <button
              type="button"
              onClick={fipe.retryModels}
              className="font-bold text-green-700"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <select
            className={selectClass}
            value={fipe.modelCode}
            onChange={(e) => fipe.selectModel(e.target.value)}
            disabled={!fipe.brandCode || fipe.loadingModels}
          >
            <option value="">
              {fipe.loadingModels ? 'Carregando modelos...' : 'Selecione o modelo'}
            </option>
            {fipe.models.map((model) => (
              <option key={model.codigo} value={String(model.codigo)}>
                {model.nome}
              </option>
            ))}
          </select>
        )}

        {fipe.yearsError ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-300 px-3 py-3 text-sm">
            <span>Não foi possível carregar os anos.</span>
            <button
              type="button"
              onClick={fipe.retryYears}
              className="font-bold text-green-700"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <select
            className={selectClass}
            value={fipe.yearCode}
            onChange={(e) => fipe.selectYear(e.target.value)}
            disabled={!fipe.modelCode || fipe.loadingYears}
          >
            <option value="">
              {fipe.loadingYears ? 'Carregando anos...' : 'Selecione o ano'}
            </option>
            {fipe.years.map((year) => (
              <option key={year.codigo} value={String(year.codigo)}>
                {year.nome}
              </option>
            ))}
          </select>
        )}

        <TextField
          placeholder="Ano de Fabricação"
          value={manufactureYear}
          onChange={(e) => setManufactureYear(e.target.value)}
          inputMode="numeric"
        />

        <TextField
          placeholder="Tipo (ex: Carro)"
          value={type}
          onChange={(e) => setType(e.target.value)}
        />

        <select
          className={selectClass}
          value={energyType}
          onChange={(e) => setEnergyType(e.target.value)}
        >
          <option value="COMBUSTION">Combustão</option>
          <option value="ELECTRIC">Elétrico</option>
          <option value="HYBRID">Híbrido</option>
        </select>

        <TextField
          placeholder="Subtipo de combustível (ex: Gasolina)"
          value={fuelSubType}
          onChange={(e) => setFuelSubType(e.target.value)}
        />

        <TextField
          placeholder="Capacidade (L)"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          inputMode="numeric"
        />

        <TextField
          placeholder="Cor"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />

        <TextField
          placeholder="Placa"
          value={licensePlate}
          onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
        />

        <TextField
          placeholder="Km Atual"
          value={currentKm}
          onChange={(e) => setCurrentKm(e.target.value)}
          inputMode="numeric"
        />

        <Button type="submit" disabled={loading}>
          {loading ? 'Cadastrando...' : 'Cadastrar'}
        </Button>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="block w-full text-center text-sm text-green-700"
        >
          Voltar
        </button>
      </form>
    </Screen>
  )
}
