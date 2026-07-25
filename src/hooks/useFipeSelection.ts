import { useEffect, useState } from 'react'
import { fetchBrands, fetchModels, fetchYears, type FipeOption } from '../services/fipe'

export function useFipeSelection() {
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
    fetchBrands()
      .then(setBrands)
      .catch(() => setBrandsError(true))
      .finally(() => setLoadingBrands(false))
  }

  useEffect(() => {
    loadBrands()
  }, [])

  function selectBrand(code: string) {
    setBrandCode(code)
    setModelCode('')
    setYearCode('')
    setModels([])
    setYears([])

    if (!code) return

    setLoadingModels(true)
    setModelsError(false)
    fetchModels(code)
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
    fetchYears(brandCode, code)
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
