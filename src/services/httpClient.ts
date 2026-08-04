import { reportNetworkError, reportNetworkSuccess } from './serverStatus'

export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  try {
    const response = await fetch(input, init)
    reportNetworkSuccess()
    return response
  } catch (err) {
    reportNetworkError()
    throw err
  }
}
