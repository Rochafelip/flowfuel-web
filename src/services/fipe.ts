const FIPE_BASE_URL = 'https://parallelum.com.br/fipe/api/v1'

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

export function fetchBrands(): Promise<FipeOption[]> {
  return fipeRequest<FipeOption[]>('/carros/marcas')
}

export function fetchModels(brandCode: string): Promise<FipeOption[]> {
  return fipeRequest<{ modelos: FipeOption[] }>(
    `/carros/marcas/${brandCode}/modelos`
  ).then((result) => result.modelos)
}

export function fetchYears(
  brandCode: string,
  modelCode: string
): Promise<FipeOption[]> {
  return fipeRequest<FipeOption[]>(
    `/carros/marcas/${brandCode}/modelos/${modelCode}/anos`
  )
}
