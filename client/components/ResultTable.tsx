import { Database } from "lucide-react"

interface Result {
  id?: number
  network?: string
  type?: string
  title?: string
  description?: string
  proposer?: string
  amount_numeric?: number
  currency?: string
  status?: string
  created_at?: string
  updated_at?: string
  [key: string]: any
}

interface ResultTableProps {
  results: Result[]
}

// Helper function to generate external links
const getExternalLinks = (result: Result) => {
  const network = result.network?.toLowerCase() || 'polkadot'
  const id = result.id
  
  if (!id) return null

  const baseUrls = {
    polkadot: {
      polkassembly: 'https://polkadot.polkassembly.io',
      subsquare: 'https://polkadot.subsquare.io',
      subscan: 'https://polkadot.subscan.io'
    },
    kusama: {
      polkassembly: 'https://kusama.polkassembly.io',
      subsquare: 'https://kusama.subsquare.io',
      subscan: 'https://kusama.subscan.io'
    }
  }

  const urls = baseUrls[network as keyof typeof baseUrls] || baseUrls.polkadot

  return {
    polkassembly: `${urls.polkassembly}/proposal/${id}`,
    subsquare: `${urls.subsquare}/proposal/${id}`,
    subscan: `${urls.subscan}/proposal/${id}`
  }
}

export default function ResultTable({ results }: ResultTableProps) {
  if (!results || results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-8 text-slate-500">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Database className="w-8 h-8 text-slate-400" />
        </div>
        <p className="text-slate-600 font-medium">No results to display</p>
        <p className="text-sm text-slate-500 mt-1">Ask a question to see results here</p>
      </div>
    )
  }

  // Define the columns we want to show in order (prioritize important ones)
  const displayColumns = [
    'id',
    'title',
    'type',
    'network',
    'amount_numeric',
    'status',
    'created_at'
  ]

  // Filter to only show columns that exist in the data
  const availableColumns = displayColumns.filter(col => 
    results.some(result => result[col] !== undefined)
  )

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <div className="min-w-full">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                {availableColumns.map((key) => (
                  <th
                    key={key}
                    className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                  >
                    {key.replace('_', ' ')}
                  </th>
                ))}
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Links
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {results.map((result, index) => {
                const links = getExternalLinks(result)
                
                return (
                  <tr key={result.id || index} className="hover:bg-slate-50 transition-colors">
                    {availableColumns.map((key) => (
                      <td
                        key={key}
                        className="px-3 py-3 text-sm text-slate-900 max-w-xs"
                      >
                        <div className="truncate" title={String(result[key] || '-')}>
                          {result[key] !== null && result[key] !== undefined
                            ? String(result[key])
                            : '-'}
                        </div>
                      </td>
                    ))}
                    <td className="px-3 py-3 text-sm text-slate-900">
                      {links ? (
                        <div className="flex space-x-1">
                          <a
                            href={links.polkassembly}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                            title="View on Polkassembly"
                          >
                            PA
                          </a>
                          <a
                            href={links.subsquare}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
                            title="View on Subsquare"
                          >
                            SS
                          </a>
                          <a
                            href={links.subscan}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors"
                            title="View on Subscan"
                          >
                            SC
                          </a>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
