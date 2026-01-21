import { ConvexProvider } from 'convex/react'
import { ConvexQueryClient } from '@convex-dev/react-query'

const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL

let convexQueryClient: ConvexQueryClient | null = null

if (CONVEX_URL) {
  convexQueryClient = new ConvexQueryClient(CONVEX_URL)
}

export default function AppConvexProvider({
  children,
}: {
  children: React.ReactNode
}) {
  if (!convexQueryClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Convex Not Configured
          </h2>
          <p className="text-gray-600 mb-4">
            Please set up your Convex backend:
          </p>
          <ol className="text-left text-sm text-gray-500 space-y-2">
            <li>1. Run: npx convex dev</li>
            <li>2. Copy the deployment URL</li>
            <li>3. Add to .env.local: VITE_CONVEX_URL=your-url</li>
            <li>4. Restart the dev server</li>
          </ol>
        </div>
      </div>
    )
  }

  return (
    <ConvexProvider client={convexQueryClient.convexClient}>
      {children}
    </ConvexProvider>
  )
}
