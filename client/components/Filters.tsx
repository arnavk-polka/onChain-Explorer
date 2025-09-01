'use client'

import { useState } from 'react'

export default function Filters() {
  const [network, setNetwork] = useState('all')
  const [type, setType] = useState('all')
  const [dateRange, setDateRange] = useState('7d')

  return (
    <div className="space-y-4">
      {/* Network Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Network
        </label>
        <select
          value={network}
          onChange={(e) => setNetwork(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Networks</option>
          <option value="ethereum">Ethereum</option>
          <option value="polygon">Polygon</option>
          <option value="arbitrum">Arbitrum</option>
          <option value="optimism">Optimism</option>
          <option value="base">Base</option>
        </select>
      </div>

      {/* Type Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Transaction Type
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          <option value="transfer">Transfer</option>
          <option value="swap">Swap</option>
          <option value="mint">Mint</option>
          <option value="burn">Burn</option>
          <option value="approval">Approval</option>
        </select>
      </div>

      {/* Date Range Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Date Range
        </label>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="1d">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
          <option value="all">All time</option>
        </select>
      </div>

      {/* Apply Filters Button */}
      <button
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
        onClick={() => {
          // Apply filters logic would go here
          console.log('Applying filters:', { network, type, dateRange })
        }}
      >
        Apply Filters
      </button>

      {/* Clear Filters Button */}
      <button
        className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
        onClick={() => {
          setNetwork('all')
          setType('all')
          setDateRange('7d')
        }}
      >
        Clear Filters
      </button>
    </div>
  )
}
