import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RotateCcw, Thermometer } from 'lucide-react'
import { CATEGORIES, type CategoryKey } from '../../../convex/scoring'

interface FilterPanelProps {
  weights: Record<string, number>
  onWeightsChange: (weights: Record<string, number>) => void
  preferredTemp: number
  onPreferredTempChange: (temp: number) => void
}

export function FilterPanel({
  weights,
  onWeightsChange,
  preferredTemp,
  onPreferredTempChange,
}: FilterPanelProps) {
  const handleWeightChange = (key: string, value: number[]) => {
    onWeightsChange({ ...weights, [key]: value[0] })
  }

  const resetWeights = () => {
    const defaultWeights: Record<string, number> = {}
    for (const key of Object.keys(CATEGORIES)) {
      defaultWeights[key] = 1
    }
    onWeightsChange(defaultWeights)
    onPreferredTempChange(20)
  }

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Adjust Weights</CardTitle>
          <Button variant="ghost" size="sm" onClick={resetWeights}>
            <RotateCcw size={14} className="mr-1" />
            Reset
          </Button>
        </div>
        <p className="text-xs text-gray-500">
          0.5x = less important, 3x = more important
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="pb-4 border-b">
          <div className="flex items-center gap-2 mb-2">
            <Thermometer size={16} className="text-orange-500" />
            <span className="text-sm font-medium">Preferred Temperature</span>
          </div>
          <div className="flex items-center gap-4">
            <Slider
              value={[preferredTemp]}
              onValueChange={(v) => onPreferredTempChange(v[0])}
              min={5}
              max={35}
              step={1}
              className="flex-1"
            />
            <span className="text-sm font-medium w-12">{preferredTemp}°C</span>
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Cold (5°C)</span>
            <span>Hot (35°C)</span>
          </div>
        </div>

        {(Object.keys(CATEGORIES) as CategoryKey[]).map((key) => {
          const cat = CATEGORIES[key]
          const weight = weights[key] ?? 1
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm">{cat.label}</span>
                <span className="text-xs text-gray-500">{weight.toFixed(1)}x</span>
              </div>
              <Slider
                value={[weight]}
                onValueChange={(v) => handleWeightChange(key, v)}
                min={0.5}
                max={3}
                step={0.5}
              />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
