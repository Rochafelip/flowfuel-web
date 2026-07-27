const FIPE_BASE_URL = 'https://parallelum.com.br/fipe/api/v1'

export type FipeVehicleCategory = 'carros' | 'motos'

export interface FipeOption {
  codigo: string | number
  nome: string
}

async function fipeRequest<T>(path: string): Promise<T> {
  const response = await fetch(`${FIPE_BASE_URL}${path}`)

  if (!response.ok) {
    throw new Error(`Falha ao consultar FIPE: ${response.status}`)
  }

  return response.json()
}

export function fetchBrands(category: FipeVehicleCategory): Promise<FipeOption[]> {
  return fipeRequest<FipeOption[]>(`/${category}/marcas`)
}

export function fetchModels(
  category: FipeVehicleCategory,
  brandCode: string
): Promise<FipeOption[]> {
  return fipeRequest<{ modelos: FipeOption[] }>(
    `/${category}/marcas/${brandCode}/modelos`
  ).then((result) => result.modelos)
}

export function fetchYears(
  category: FipeVehicleCategory,
  brandCode: string,
  modelCode: string
): Promise<FipeOption[]> {
  return fipeRequest<FipeOption[]>(
    `/${category}/marcas/${brandCode}/modelos/${modelCode}/anos`
  )
}
