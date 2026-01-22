import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('cities').collect()
  },
})

export const getById = query({
  args: { id: v.id('cities') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

export const getByUrauCode = query({
  args: { urauCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('cities')
      .withIndex('by_urauCode', (q) => q.eq('urauCode', args.urauCode))
      .first()
  },
})

export const listByCountry = query({
  args: { country: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('cities')
      .withIndex('by_country', (q) => q.eq('country', args.country))
      .collect()
  },
})

export const add = mutation({
  args: {
    urauCode: v.string(),
    name: v.string(),
    country: v.string(),
    lat: v.number(),
    lon: v.number(),
    areaSqKm: v.number(),
    isCapital: v.boolean(),
    population: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('cities', {
      ...args,
      lastUpdated: Date.now(),
    })
  },
})

export const update = mutation({
  args: {
    id: v.id('cities'),
    name: v.optional(v.string()),
    population: v.optional(v.number()),
    isCapital: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    )
    if (Object.keys(cleanUpdates).length > 0) {
      await ctx.db.patch(id, { ...cleanUpdates, lastUpdated: Date.now() })
    }
    return await ctx.db.get(id)
  },
})

export const updateDescription = mutation({
  args: {
    id: v.id('cities'),
    description: v.string(),
    thumbnail: v.optional(v.string()),
    wikiUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      description: args.description,
      thumbnail: args.thumbnail,
      wikiUrl: args.wikiUrl,
      lastUpdated: Date.now(),
    })
  },
})

export const remove = mutation({
  args: { id: v.id('cities') },
  handler: async (ctx, args) => {
    const metrics = await ctx.db
      .query('cityMetrics')
      .withIndex('by_city', (q) => q.eq('cityId', args.id))
      .collect()
    for (const metric of metrics) {
      await ctx.db.delete(metric._id)
    }
    await ctx.db.delete(args.id)
  },
})

export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const cities = await ctx.db.query('cities').collect()
    for (const city of cities) {
      await ctx.db.delete(city._id)
    }
    const metrics = await ctx.db.query('cityMetrics').collect()
    for (const metric of metrics) {
      await ctx.db.delete(metric._id)
    }
  },
})

export const getMetrics = query({
  args: { cityId: v.id('cities') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('cityMetrics')
      .withIndex('by_city', (q) => q.eq('cityId', args.cityId))
      .collect()
  },
})

export const getMetricsByCategory = query({
  args: { cityId: v.id('cities'), category: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('cityMetrics')
      .withIndex('by_city_category', (q) =>
        q.eq('cityId', args.cityId).eq('category', args.category)
      )
      .collect()
  },
})

export const getCitiesWithAmenities = query({
  args: {},
  handler: async (ctx) => {
    const metrics = await ctx.db
      .query('cityMetrics')
      .filter((q) => q.eq(q.field('category'), 'amenities'))
      .collect()
    const cityIds = [...new Set(metrics.map((m) => m.cityId.toString()))]
    return cityIds.map((id) => ({ cityId: id }))
  },
})

export const getCitiesWithInfrastructure = query({
  args: {},
  handler: async (ctx) => {
    const metrics = await ctx.db
      .query('cityMetrics')
      .filter((q) => q.eq(q.field('category'), 'infrastructure'))
      .collect()
    const cityIds = [...new Set(metrics.map((m) => m.cityId.toString()))]
    return cityIds.map((id) => ({ cityId: id }))
  },
})

export const getCitiesWithNature = query({
  args: {},
  handler: async (ctx) => {
    const metrics = await ctx.db
      .query('cityMetrics')
      .filter((q) => q.eq(q.field('category'), 'nature'))
      .collect()
    const cityIds = [...new Set(metrics.map((m) => m.cityId.toString()))]
    return cityIds.map((id) => ({ cityId: id }))
  },
})

export const upsertMetric = mutation({
  args: {
    cityId: v.id('cities'),
    category: v.string(),
    metricKey: v.string(),
    value: v.number(),
    rawData: v.optional(v.any()),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('cityMetrics')
      .withIndex('by_city_category', (q) =>
        q.eq('cityId', args.cityId).eq('category', args.category)
      )
      .filter((q) => q.eq(q.field('metricKey'), args.metricKey))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        rawData: args.rawData,
        source: args.source,
        fetchedAt: Date.now(),
      })
      return existing._id
    } else {
      return await ctx.db.insert('cityMetrics', {
        ...args,
        fetchedAt: Date.now(),
      })
    }
  },
})
