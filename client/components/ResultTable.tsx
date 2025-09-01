interface Result {
  id?: number
  description?: string
  amount?: number
  [key: string]: any
}

interface ResultTableProps {
  results: Result[]
}

export default function ResultTable({ results }: ResultTableProps) {
  if (!results || results.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No results to display</p>
        <p className="text-sm">Ask a question to see results here</p>
      </div>
    )
  }

  // Get all unique keys from results
  const allKeys = Array.from(
    new Set(results.flatMap(result => Object.keys(result)))
  )

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {allKeys.map((key) => (
              <th
                key={key}
                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {results.map((result, index) => (
            <tr key={result.id || index} className="hover:bg-gray-50">
              {allKeys.map((key) => (
                <td
                  key={key}
                  className="px-3 py-2 whitespace-nowrap text-sm text-gray-900"
                >
                  {result[key] !== null && result[key] !== undefined
                    ? String(result[key])
                    : '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
