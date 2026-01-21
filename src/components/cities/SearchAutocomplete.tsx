import { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface City {
  _id: string
  name: string
  country: string
}

interface SearchAutocompleteProps {
  cities: City[]
  value: string
  onChange: (value: string) => void
  onSelect?: (city: City) => void
}

const COUNTRY_FLAGS: Record<string, string> = {
  AT: '\uD83C\uDDE6\uD83C\uDDF9',
  BE: '\uD83C\uDDE7\uD83C\uDDEA',
  BG: '\uD83C\uDDE7\uD83C\uDDEC',
  HR: '\uD83C\uDDED\uD83C\uDDF7',
  CY: '\uD83C\uDDE8\uD83C\uDDFE',
  CZ: '\uD83C\uDDE8\uD83C\uDDFF',
  DK: '\uD83C\uDDE9\uD83C\uDDF0',
  EE: '\uD83C\uDDEA\uD83C\uDDEA',
  FI: '\uD83C\uDDEB\uD83C\uDDEE',
  FR: '\uD83C\uDDEB\uD83C\uDDF7',
  DE: '\uD83C\uDDE9\uD83C\uDDEA',
  GR: '\uD83C\uDDEC\uD83C\uDDF7',
  HU: '\uD83C\uDDED\uD83C\uDDFA',
  IE: '\uD83C\uDDEE\uD83C\uDDEA',
  IT: '\uD83C\uDDEE\uD83C\uDDF9',
  LV: '\uD83C\uDDF1\uD83C\uDDFB',
  LT: '\uD83C\uDDF1\uD83C\uDDF9',
  LU: '\uD83C\uDDF1\uD83C\uDDFA',
  MT: '\uD83C\uDDF2\uD83C\uDDF9',
  NL: '\uD83C\uDDF3\uD83C\uDDF1',
  PL: '\uD83C\uDDF5\uD83C\uDDF1',
  PT: '\uD83C\uDDF5\uD83C\uDDF9',
  RO: '\uD83C\uDDF7\uD83C\uDDF4',
  SK: '\uD83C\uDDF8\uD83C\uDDF0',
  SI: '\uD83C\uDDF8\uD83C\uDDEE',
  ES: '\uD83C\uDDEA\uD83C\uDDF8',
  SE: '\uD83C\uDDF8\uD83C\uDDEA',
  NO: '\uD83C\uDDF3\uD83C\uDDF4',
  CH: '\uD83C\uDDE8\uD83C\uDDED',
  UK: '\uD83C\uDDEC\uD83C\uDDE7',
  GB: '\uD83C\uDDEC\uD83C\uDDE7',
}

export function SearchAutocomplete({
  cities,
  value,
  onChange,
  onSelect,
}: SearchAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredCities = value.length > 0
    ? cities
        .filter(
          (c) =>
            c.name.toLowerCase().includes(value.toLowerCase()) ||
            c.country.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 8)
    : []

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredCities.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev < filteredCities.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCities.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0) {
          const city = filteredCities[highlightedIndex]
          onChange(city.name)
          onSelect?.(city)
          setIsOpen(false)
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  const handleSelect = (city: City) => {
    onChange(city.name)
    onSelect?.(city)
    setIsOpen(false)
    inputRef.current?.blur()
  }

  return (
    <div ref={wrapperRef} className="relative">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        size={20}
      />
      <Input
        ref={inputRef}
        placeholder="Search cities..."
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setIsOpen(true)
          setHighlightedIndex(-1)
        }}
        onFocus={() => value.length > 0 && setIsOpen(true)}
        onKeyDown={handleKeyDown}
        className="pl-10 pr-8"
      />
      {value && (
        <button
          onClick={() => {
            onChange('')
            setIsOpen(false)
            inputRef.current?.focus()
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X size={16} />
        </button>
      )}

      {isOpen && filteredCities.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-auto">
          {filteredCities.map((city, index) => (
            <button
              key={city._id}
              onClick={() => handleSelect(city)}
              className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-gray-100 ${
                index === highlightedIndex ? 'bg-gray-100' : ''
              }`}
            >
              <span>{COUNTRY_FLAGS[city.country] || ''}</span>
              <span className="font-medium">{city.name}</span>
              <span className="text-gray-400 text-sm">{city.country}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
