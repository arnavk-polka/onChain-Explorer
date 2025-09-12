'use client'

import { useState } from 'react'

interface FiltersProps {
  onFiltersChange?: (filters: any) => void
}

export default function Filters({ onFiltersChange }: FiltersProps) {
  const [network, setNetwork] = useState('all')
  const [type, setType] = useState('all')
  const [dateRange, setDateRange] = useState('7d')

  const handleFilterChange = (newFilters: any) => {
    if (onFiltersChange) {
      onFiltersChange(newFilters)
    }
  }

  return (
    <div className="space-y-4">
      {/* Network Filter */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Network
        </label>
        <select
          value={network}
          onChange={(e) => {
            setNetwork(e.target.value)
            handleFilterChange({ network: e.target.value, type, dateRange })
          }}
          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-colors text-slate-900"
        >
          <option value="all">All Networks</option>
          <option value="polkadot">Polkadot</option>
          <option value="kusama">Kusama</option>
        </select>
      </div>

      {/* Proposal Type Filter */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Proposal Type
        </label>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value)
            handleFilterChange({ network, type: e.target.value, dateRange })
          }}
          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-colors text-slate-900"
        >
          <option value="all">All Types</option>
          <option value="TreasuryProposal">Treasury Proposal</option>
          <option value="DemocracyProposal">Democracy Proposal</option>
          <option value="Referendum">Referendum</option>
          <option value="Bounty">Bounty</option>
          <option value="Tip">Tip</option>
          <option value="CouncilMotion">Council Motion</option>
          <option value="TechCommitteeProposal">Tech Committee Proposal</option>
        </select>
      </div>

      {/* Date Range Filter */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Date Range
        </label>
        <select
          value={dateRange}
          onChange={(e) => {
            setDateRange(e.target.value)
            handleFilterChange({ network, type, dateRange: e.target.value })
          }}
          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-colors text-slate-900"
        >
          <option value="1d">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
          <option value="all">All time</option>
        </select>
      </div>

      {/* Clear Filters Button */}
      <button
        className="w-full bg-slate-100 text-slate-700 py-2.5 px-4 rounded-lg hover:bg-slate-200 transition-colors font-medium text-sm shadow-sm"
        onClick={() => {
          setNetwork('all')
          setType('all')
          setDateRange('7d')
          handleFilterChange({ network: 'all', type: 'all', dateRange: '7d' })
        }}
      >
        Clear Filters
      </button>
    </div>
  )
}
