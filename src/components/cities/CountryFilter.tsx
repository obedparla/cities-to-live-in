import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Globe, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { countryFlag, countryName } from '@/lib/countries'

interface CountryFilterProps {
  countries: { code: string; cityCount: number }[]
  selected: string[]
  onChange: (selected: string[]) => void
}

export function CountryFilter({
  countries,
  selected,
  onChange,
}: CountryFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const sortedCountries = [...countries].sort((a, b) =>
    countryName(a.code).localeCompare(countryName(b.code))
  )

  const filteredCountries = sortedCountries.filter((c) => {
    const query = search.toLowerCase()
    return (
      countryName(c.code).toLowerCase().includes(query) ||
      c.code.toLowerCase().includes(query)
    )
  })

  const toggleCountry = (code: string) => {
    onChange(
      selected.includes(code)
        ? selected.filter((c) => c !== code)
        : [...selected, code]
    )
  }

  const buttonLabel =
    selected.length === 0
      ? 'All countries'
      : selected.length === 1
        ? `${countryFlag(selected[0])} ${countryName(selected[0])}`
        : `${selected.length} countries`

  return (
    <div ref={wrapperRef} className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen((o) => !o)}
        className="min-w-44 justify-between"
      >
        <span className="flex items-center gap-2">
          <Globe size={16} />
          {buttonLabel}
        </span>
        <ChevronDown size={16} className="text-gray-400" />
      </Button>

      {isOpen && (
        <div className="absolute z-50 mt-1 right-0 md:left-0 w-72 bg-white border rounded-lg shadow-lg flex flex-col max-h-96">
          <div className="p-2 border-b flex items-center gap-2">
            <input
              autoFocus
              type="text"
              placeholder="Search country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-2 py-1 text-sm outline-none border rounded"
            />
            {selected.length > 0 && (
              <button
                onClick={() => onChange([])}
                className="text-xs text-gray-500 hover:text-gray-800 px-2"
              >
                Clear
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {filteredCountries.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-400 text-center">
                No countries found
              </div>
            ) : (
              filteredCountries.map((country) => {
                const isSelected = selected.includes(country.code)
                return (
                  <button
                    key={country.code}
                    onClick={() => toggleCountry(country.code)}
                    className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-gray-50 ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                  >
                    <span className="w-4 flex items-center justify-center">
                      {isSelected && (
                        <Check size={14} className="text-blue-600" />
                      )}
                    </span>
                    <span>{countryFlag(country.code)}</span>
                    <span className="flex-1 text-sm">
                      {countryName(country.code)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {country.cityCount}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface SelectedCountryBadgesProps {
  selected: string[]
  onRemove: (code: string) => void
  onClear: () => void
}

export function SelectedCountryBadges({
  selected,
  onRemove,
  onClear,
}: SelectedCountryBadgesProps) {
  if (selected.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-xs text-gray-500">Filtering by:</span>
      {selected.map((code) => (
        <span
          key={code}
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs"
        >
          <span>{countryFlag(code)}</span>
          <span>{countryName(code)}</span>
          <button
            onClick={() => onRemove(code)}
            className="ml-0.5 p-0.5 hover:bg-blue-200 rounded-full"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <button
        onClick={onClear}
        className="text-xs text-gray-500 hover:text-gray-800 underline"
      >
        Clear all
      </button>
    </div>
  )
}
