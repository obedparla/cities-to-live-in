import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  cities: defineTable({
    urauCode: v.string(),
    name: v.string(),
    country: v.string(),
    lat: v.number(),
    lon: v.number(),
    areaSqKm: v.number(),
    isCapital: v.boolean(),
    population: v.optional(v.number()),
    description: v.optional(v.string()),
    thumbnail: v.optional(v.string()),
    wikiUrl: v.optional(v.string()),
    lastUpdated: v.number(),
  })
    .index('by_country', ['country'])
    .index('by_urauCode', ['urauCode']),

  cityMetrics: defineTable({
    cityId: v.id('cities'),
    category: v.string(),
    metricKey: v.string(),
    value: v.number(),
    rawData: v.optional(v.any()),
    source: v.string(),
    fetchedAt: v.number(),
  })
    .index('by_city', ['cityId'])
    .index('by_city_category', ['cityId', 'category'])
    .index('by_category_key', ['category', 'metricKey']),
})
