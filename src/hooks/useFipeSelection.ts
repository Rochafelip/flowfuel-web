import { useEffect, useState } from 'react'
import {
  fetchBrands,
  fetchModels,
  fetchYears,
  type FipeOption,
  type FipeVehicleCategory,
} from '../services/fipe'

export function useFipeSelection(category: FipeVehicleCategory) {
  const [brands, setBrands] = useState<FipeOption[]>([])
  const [models, setModels] = useState<FipeOption[]>([])
  const [years, setYears] = useState<FipeOption[]>([])

  const [brandCode, setBrandCode] = useState('')
  const [modelCode, setModelCode] = useState('')
  const [yearCode, setYearCode] = useState('')

  const [loadingBrands, setLoadingBrands] = useState(true)
  const [loadingModels, setLoadingModels] = useState(false)
  const [loadingYears, setLoadingYears] = useState(false)

  const [brandsError, setBrandsError] = useState(false)
  const [modelsError, setModelsError] = useState(false)
  const [yearsError, setYearsError] = useState(false)

  function loadBrands() {
    setLoadingBrands(true)
    setBrandsError(false)
    fetchBrands(category)
      .then(setBrands)
      .catch(() => setBrandsError(true))
      .finally(() => setLoadingBrands(false))
  }

  useEffect(() => {
    setBrandCode('')
    setModelCode('')
    setYearCode('')
    setModels([])
    setYears([])
    loadBrands()
    // loadBrands is intentionally not in the dep array: it closes over `category`
    // itself, and including it would just re-describe this same effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  function selectBrand(code: string) {
    setBrandCode(code)
    setModelCode('')
    setYearCode('')
    setModels([])
    setYears([])

    if (!code) return

    setLoadingModels(true)
    setModelsError(false)
    fetchModels(category, code)
      .then(setModels)
      .catch(() => setModelsError(true))
      .finally(() => setLoadingModels(false))
  }

  function selectModel(code: string) {
    setModelCode(code)
    setYearCode('')
    setYears([])

    if (!code) return

    setLoadingYears(true)
    setYearsError(false)
    fetchYears(category, brandCode, code)
      .then(setYears)
      .catch(() => setYearsError(true))
      .finally(() => setLoadingYears(false))
  }

  function selectYear(code: string) {
    setYearCode(code)
  }

  const brandName = brands.find((b) => String(b.codigo) === brandCode)?.nome ?? ''
  const modelName = models.find((m) => String(m.codigo) === modelCode)?.nome ?? ''
  const modelYear = yearCode ? parseInt(yearCode, 10) : null

  return {
    brands,
    models,
    years,
    brandCode,
    modelCode,
    yearCode,
    loadingBrands,
    loadingModels,
    loadingYears,
    brandsError,
    modelsError,
    yearsError,
    retryBrands: loadBrands,
    retryModels: () => selectBrand(brandCode),
    retryYears: () => selectModel(modelCode),
    selectBrand,
    selectModel,
    selectYear,
    brandName,
    modelName,
    modelYear,
  }
}
