import { createFileRoute } from '@tanstack/react-router'
import { MapPin, BarChart3, Sliders, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/' as never)({ component: Home })

function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <section className="py-20 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-6">
            <MapPin className="w-16 h-16 text-blue-600" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Find Your Perfect City
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Compare European cities based on what matters to you - income,
            weather, safety, culture, and more. Customize weights to find your
            ideal place to live.
          </p>
<a href="/cities">
            <Button size="lg" className="text-lg px-8">
              Explore Cities <ArrowRight className="ml-2" />
            </Button>
          </a>
        </div>
      </section>

      <section className="py-16 px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<BarChart3 className="w-10 h-10 text-blue-600" />}
            title="Data-Driven Rankings"
            description="Compare 100+ European cities using official Eurostat data, weather info, and OpenStreetMap amenities."
          />
          <FeatureCard
            icon={<Sliders className="w-10 h-10 text-blue-600" />}
            title="Custom Weights"
            description="Adjust importance of each factor - prioritize income, sunshine, culture, or safety to match your preferences."
          />
          <FeatureCard
            icon={<MapPin className="w-10 h-10 text-blue-600" />}
            title="Side-by-Side Compare"
            description="Select multiple cities to compare them directly across all metrics in a detailed view."
          />
        </div>
      </section>

      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Categories We Compare
          </h2>
          <p className="text-gray-600 mb-8">
            Make informed decisions with comprehensive data across 12+ metrics
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              'Population',
              'Income',
              'Unemployment',
              'Cost of Living',
              'Healthcare',
              'Crime Rate',
              'Education',
              'Temperature',
              'Sunshine',
              'Air Quality',
              'Culture',
              'Green Spaces',
            ].map((cat) => (
              <span
                key={cat}
                className="px-4 py-2 bg-white rounded-full text-sm font-medium text-gray-700 shadow-sm border"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}
