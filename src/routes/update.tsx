import { createFileRoute } from '@tanstack/react-router'
import { useAction } from 'convex/react'
import { useState } from 'react'
import { api } from '../../convex/_generated/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  CloudSun,
  Wind,
  Trees,
  BarChart3,
  Building2,
  HeartPulse,
  Globe,
  Mountain,
  Wifi,
  CheckCircle2,
  XCircle,
  Play,
  ArrowLeft,
  RefreshCw,
  BookOpen,
} from 'lucide-react'

export const Route = createFileRoute('/update' as never)({
  component: UpdatePage,
})

type ApiStatus = 'idle' | 'loading' | 'success' | 'error'

interface ApiConfig {
  key: string
  label: string
  icon: React.ReactNode
  supportsBatching?: boolean
}

interface BatchResult {
  success: number
  failed: number
  skipped: number
  total: number
  processed: number
}

function UpdatePage() {
  const [statuses, setStatuses] = useState<Record<string, ApiStatus>>({})
  const [results, setResults] = useState<Record<string, string>>({})
  const [isRunning, setIsRunning] = useState(false)
  const [forceRefresh, setForceRefresh] = useState(false)

  const fetchWeather = useAction(api.actions.fetchAllData.fetchWeatherForAllCities)
  const fetchAirQuality = useAction(api.actions.fetchAllData.fetchAirQualityForAllCities)
  const fetchAmenities = useAction(api.actions.fetchAllData.fetchAmenitiesForAllCities)
  const fetchEurostat = useAction(api.actions.fetchAllData.fetchEurostatForAllCities)
  const fetchInfrastructure = useAction(api.actions.fetchAllData.fetchInfrastructureForAllCities)
  const fetchHealthcare = useAction(api.actions.fetchAllData.fetchHealthcareForAllCities)
  const fetchExpat = useAction(api.actions.fetchAllData.fetchExpatDataForAllCities)
  const fetchNature = useAction(api.actions.fetchAllData.fetchNatureProximityForAllCities)
  const fetchInternet = useAction(api.actions.fetchAllData.fetchInternetSpeedForAllCities)
  const fetchWikipedia = useAction(api.actions.wikipedia.fetchDescriptionsForAllCities)

  const apis: ApiConfig[] = [
    { key: 'weather', label: 'Weather Data', icon: <CloudSun size={20} /> },
    { key: 'air', label: 'Air Quality', icon: <Wind size={20} /> },
    { key: 'amenities', label: 'Amenities (OSM)', icon: <Trees size={20} />, supportsBatching: true },
    { key: 'eurostat', label: 'Eurostat Data', icon: <BarChart3 size={20} /> },
    { key: 'infrastructure', label: 'Infrastructure (OSM)', icon: <Building2 size={20} />, supportsBatching: true },
    { key: 'healthcare', label: 'Healthcare', icon: <HeartPulse size={20} /> },
    { key: 'expat', label: 'Expat Data', icon: <Globe size={20} /> },
    { key: 'nature', label: 'Nature (OSM)', icon: <Mountain size={20} />, supportsBatching: true },
    { key: 'internet', label: 'Internet Speed', icon: <Wifi size={20} /> },
    { key: 'wikipedia', label: 'Wikipedia Descriptions', icon: <BookOpen size={20} /> },
  ]

  const runBatchedAction = async (
    key: string,
    useForceRefresh: boolean,
    onProgress: (msg: string) => void
  ): Promise<{ success: number; failed: number }> => {
    let offset = 0
    let totalSuccess = 0
    let totalFailed = 0

    const fetchFn = key === 'amenities' ? fetchAmenities
      : key === 'infrastructure' ? fetchInfrastructure
      : fetchNature

    while (true) {
      onProgress(`Batch ${Math.floor(offset / 10) + 1}...`)
      const result = await fetchFn({ forceRefresh: useForceRefresh, offset }) as BatchResult
      totalSuccess += result.success
      totalFailed += result.failed

      if (result.processed >= result.total) {
        break
      }
      offset = result.processed
    }

    return { success: totalSuccess, failed: totalFailed }
  }

  const runAction = async (
    key: string,
    useForceRefresh: boolean,
    onProgress?: (msg: string) => void
  ) => {
    if (['amenities', 'infrastructure', 'nature'].includes(key) && onProgress) {
      return runBatchedAction(key, useForceRefresh, onProgress)
    }

    switch (key) {
      case 'weather': return fetchWeather()
      case 'air': return fetchAirQuality()
      case 'amenities': return fetchAmenities({ forceRefresh: useForceRefresh })
      case 'eurostat': return fetchEurostat()
      case 'infrastructure': return fetchInfrastructure({ forceRefresh: useForceRefresh })
      case 'healthcare': return fetchHealthcare()
      case 'expat': return fetchExpat()
      case 'nature': return fetchNature({ forceRefresh: useForceRefresh })
      case 'internet': return fetchInternet()
      case 'wikipedia': return fetchWikipedia()
      default: throw new Error(`Unknown API: ${key}`)
    }
  }

  const runSingleApi = async (apiConfig: ApiConfig, useForceRefresh = forceRefresh) => {
    setStatuses((prev) => ({ ...prev, [apiConfig.key]: 'loading' }))
    setResults((prev) => ({ ...prev, [apiConfig.key]: '' }))

    const onProgress = (msg: string) => {
      setResults((prev) => ({ ...prev, [apiConfig.key]: msg }))
    }

    try {
      const result = await runAction(apiConfig.key, useForceRefresh, onProgress)
      setStatuses((prev) => ({ ...prev, [apiConfig.key]: 'success' }))
      setResults((prev) => ({
        ...prev,
        [apiConfig.key]: typeof result === 'object' ? JSON.stringify(result) : String(result),
      }))
    } catch (e) {
      setStatuses((prev) => ({ ...prev, [apiConfig.key]: 'error' }))
      setResults((prev) => ({
        ...prev,
        [apiConfig.key]: e instanceof Error ? e.message : 'Unknown error',
      }))
    }
  }

  const runAllApis = async () => {
    setIsRunning(true)
    setStatuses({})
    setResults({})

    const initialStatuses: Record<string, ApiStatus> = {}
    apis.forEach((a) => (initialStatuses[a.key] = 'loading'))
    setStatuses(initialStatuses)

    // Run sequentially to avoid overwhelming the APIs
    for (const apiConfig of apis) {
      await runSingleApi(apiConfig, forceRefresh)
    }

    setIsRunning(false)
  }

  const completedCount = Object.values(statuses).filter(
    (s) => s === 'success' || s === 'error'
  ).length
  const successCount = Object.values(statuses).filter((s) => s === 'success').length
  const totalCount = apis.length

  const getStatusIcon = (status: ApiStatus) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
    }
  }

  const getStatusBg = (status: ApiStatus) => {
    switch (status) {
      case 'loading':
        return 'bg-blue-50 border-blue-200'
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <a href="/cities">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft size={16} className="mr-2" />
            Back to Cities
          </Button>
        </a>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">Update All Data</CardTitle>
            <p className="text-gray-500 text-sm mt-1">
              Fetch data from all APIs to update city metrics
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="forceRefresh"
                checked={forceRefresh}
                onChange={(e) => setForceRefresh(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="forceRefresh" className="text-sm text-gray-700">
                Force refresh (re-fetch even if data exists)
              </label>
            </div>

            <Button
              onClick={runAllApis}
              disabled={isRunning}
              size="lg"
              className="w-full"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Updating... ({completedCount}/{totalCount})
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Fetch All APIs
                </>
              )}
            </Button>

            {completedCount > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>
                    {successCount}/{totalCount} successful
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${(completedCount / totalCount) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-3">
          {apis.map((apiConfig) => {
            const status = statuses[apiConfig.key] || 'idle'
            const result = results[apiConfig.key]

            return (
              <div
                key={apiConfig.key}
                className={`border rounded-lg p-4 transition-all ${getStatusBg(status)}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-600">{apiConfig.icon}</span>
                  <span className="font-medium flex-1">
                    {apiConfig.label}
                    {apiConfig.supportsBatching && (
                      <span className="text-xs text-gray-400 ml-2">(batched)</span>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={status === 'loading' || isRunning}
                    onClick={() => runSingleApi(apiConfig, forceRefresh)}
                  >
                    <RefreshCw size={14} className={status === 'loading' ? 'animate-spin' : ''} />
                  </Button>
                  {getStatusIcon(status)}
                </div>
                {result && (
                  <p
                    className={`text-xs mt-2 ${status === 'error' ? 'text-red-600' : 'text-gray-500'}`}
                  >
                    {result.length > 100 ? result.slice(0, 100) + '...' : result}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
