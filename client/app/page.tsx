'use client'

import { useChat } from 'ai/react'
import { useState, useEffect } from 'react'
import { Send, Database, Filter, X, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import ProposalTable from '@/components/ProposalTable'
import Filters from '@/components/Filters'
import { Proposal } from '@/lib/dataUtils'

export default function Home() {
  const [showSqlDrawer, setShowSqlDrawer] = useState(false)
  const [currentSql, setCurrentSql] = useState('')
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [filteredProposals, setFilteredProposals] = useState<Proposal[]>([])
  const [proposalDescriptions, setProposalDescriptions] = useState<Record<string, string>>({})
  const [showSql, setShowSql] = useState(false)
  const [count, setCount] = useState<number | null>(null)
  const [isLoadingProposals, setIsLoadingProposals] = useState(false)
  const [filters, setFilters] = useState({
    network: 'all',
    type: 'all',
    dateRange: 'all'
  })
  
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: {
      filters: filters
    },
    onFinish: (message) => {
      console.log('Message finished:', message)
      setIsLoadingProposals(false)
      // The data will be handled by the useEffect below
    },
    onError: (error) => {
      console.error('Chat error:', error)
      setIsLoadingProposals(false)
    }
  })

  // Handle data extraction from the last message using useEffect
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content) {
      const content = lastMessage.content
      console.log('Checking content for proposal data:', content)
      
      // Check for proposal descriptions data (JSON format)
      try {
        const jsonMatch = content.match(/\{.*"type":\s*"proposal_descriptions".*\}/)
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0])
          console.log('Extracted proposal descriptions:', data)
          
          if (data.type === 'proposal_descriptions' && data.proposals) {
            const descriptions: Record<string, string> = {}
            data.proposals.forEach((proposal: any) => {
              if (proposal.id && proposal.description) {
                descriptions[proposal.id] = proposal.description
              }
            })
            setProposalDescriptions(prev => ({ ...prev, ...descriptions }))
          }
        }
      } catch (e) {
        console.log('No proposal descriptions found in content or parsing error:', e)
      }
      
      // Check for regular proposal data (array format) - look for the proposals array
      try {
        // Look for proposals array in the content - more flexible regex
        const proposalsMatch = content.match(/\[{.*"id":\s*"[^"]+".*}\]/)
        if (proposalsMatch) {
          const jsonData = JSON.parse(proposalsMatch[0])
          console.log('Extracted proposals array:', jsonData)
          
          if (Array.isArray(jsonData) && jsonData.length > 0 && jsonData[0].id) {
            console.log('Setting proposals from content array:', jsonData)
            setProposals(jsonData)
            setCount(jsonData.length)
            return
          }
        }
        
        // Also look for "Data: " prefix
        const dataMatch = content.match(/Data: (\[{.*}\])/)
        if (dataMatch) {
          const jsonData = JSON.parse(dataMatch[1])
          console.log('Extracted data from Data prefix:', jsonData)
          
          if (Array.isArray(jsonData)) {
            console.log('Setting proposals from Data prefix:', jsonData)
            setProposals(jsonData)
            setCount(jsonData.length)
          }
        }
        
        // Look for any JSON array that looks like proposals
        const anyJsonMatch = content.match(/\[{.*"id".*}\]/)
        if (anyJsonMatch) {
          const jsonData = JSON.parse(anyJsonMatch[0])
          console.log('Extracted any JSON array:', jsonData)
          
          if (Array.isArray(jsonData) && jsonData.length > 0 && jsonData[0].id) {
            console.log('Setting proposals from any JSON array:', jsonData)
            setProposals(jsonData)
            setCount(jsonData.length)
          }
        }
        
        // Try to find any JSON array in the content
        const lines = content.split('\n')
        for (const line of lines) {
          if (line.trim().startsWith('[') && line.trim().endsWith(']')) {
            try {
              const jsonData = JSON.parse(line.trim())
              if (Array.isArray(jsonData) && jsonData.length > 0 && jsonData[0].id) {
                console.log('Setting proposals from line array:', jsonData)
                setProposals(jsonData)
                setCount(jsonData.length)
                break
              }
            } catch (e) {
              // Continue to next line
            }
          }
        }
      } catch (e) {
        console.log('No JSON found in content or parsing error:', e)
      }
    }
  }, [messages]) // Only run when messages change

  // Handle streaming data extraction from the chat API
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content) {
      const content = lastMessage.content
      
      // Look for proposals data that comes from streaming
      try {
        // Check if content contains proposal data in the format we expect
        if (content.includes('Found') && content.includes('relevant proposals')) {
          // Extract proposals from the markdown content
          const proposalMatches = content.match(/## Proposal \d+: ([^\n]+)\n\*\*ID:\*\* ([^\n]+)\n\*\*Type:\*\* ([^\n]+)\n\*\*Network:\*\* ([^\n]+)\n\*\*Proposer:\*\* ([^\n]+)\n\*\*Status:\*\* ([^\n]+)\n\*\*Created:\*\* ([^\n]+)/g)
          
          if (proposalMatches) {
            const extractedProposals = proposalMatches.map((match, index) => {
              const lines = match.split('\n')
              const title = lines[0].replace(/## Proposal \d+: /, '')
              const id = lines[1].replace(/\*\*ID:\*\* /, '')
              const type = lines[2].replace(/\*\*Type:\*\* /, '')
              const network = lines[3].replace(/\*\*Network:\*\* /, '')
              const proposer = lines[4].replace(/\*\*Proposer:\*\* /, '')
              const status = lines[5].replace(/\*\*Status:\*\* /, '')
              const created = lines[6].replace(/\*\*Created:\*\* /, '')
              
              return {
                id,
                title,
                type,
                network,
                proposer,
                status,
                created_at: created,
                description: '[Loading description...]'
              }
            })
            
            console.log('Extracted proposals from markdown:', extractedProposals)
            setProposals(extractedProposals)
            setFilteredProposals(extractedProposals)
            setCount(extractedProposals.length)
            setIsLoadingProposals(false)
          }
        }
      } catch (e) {
        console.log('Error extracting proposals from markdown:', e)
      }
    }
  }, [messages])

  // Force table display when we have proposals data
  useEffect(() => {
    if (proposals.length > 0) {
      console.log('Proposals found, forcing table display:', proposals)
    }
  }, [proposals])

  // Filter proposals based on current filters
  const filterProposals = (proposalList: Proposal[], currentFilters: any) => {
    return proposalList.filter(proposal => {
      // Network filter
      if (currentFilters.network !== 'all' && proposal.network?.toLowerCase() !== currentFilters.network) {
        return false
      }

      // Type filter
      if (currentFilters.type !== 'all' && proposal.type !== currentFilters.type) {
        return false
      }

      // Date range filter
      if (currentFilters.dateRange !== 'all' && proposal.created_at) {
        const proposalDate = new Date(proposal.created_at)
        const now = new Date()
        const daysDiff = Math.floor((now.getTime() - proposalDate.getTime()) / (1000 * 60 * 60 * 24))

        switch (currentFilters.dateRange) {
          case '1d':
            if (daysDiff > 1) return false
            break
          case '7d':
            if (daysDiff > 7) return false
            break
          case '30d':
            if (daysDiff > 30) return false
            break
          case '90d':
            if (daysDiff > 90) return false
            break
          case '1y':
            if (daysDiff > 365) return false
            break
        }
      }

      return true
    })
  }

  // Handle filter application
  const handleApplyFilters = (newFilters: any) => {
    setFilters(newFilters)
    const filtered = filterProposals(proposals, newFilters)
    setFilteredProposals(filtered)
  }

  // Debug: Log current state
  useEffect(() => {
    console.log('Current proposals:', proposals)
    console.log('Current descriptions:', proposalDescriptions)
    console.log('Current count:', count)
  }, [proposals, proposalDescriptions, count])

  // Debug: Log messages changes (only when they actually change)
  useEffect(() => {
    console.log('Current messages:', messages)
    console.log('Current proposals:', proposals)
    console.log('Current descriptions:', proposalDescriptions)
    console.log('Current count:', count)
  }, [messages, proposals, proposalDescriptions, count])

  // Check if message contains count-related keywords
  const isCountQuery = (message: string) => {
    return /count|how many|total|number of/i.test(message)
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200 px-6 py-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Onchain Explorer
              </h1>
              <p className="text-slate-600 text-sm">Ask questions about your onchain data</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {messages.map((message) => {
            // Check if this message contains proposals and should show table instead
            const shouldShowTable = message.role === 'assistant' && 
              proposals.length > 0 && 
              message.content.includes('Found') && 
              message.content.includes('relevant proposals')
            
            // Show loader if we're loading proposals
            if (isLoadingProposals && message.role === 'assistant' && message.content.includes('Found')) {
              return (
                <div key={message.id} className="space-y-4">
                  <div className="flex justify-start">
                    <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl px-6 py-4 shadow-sm max-w-4xl">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <span className="text-slate-600 text-sm">Loading proposals...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }
            
            if (shouldShowTable) {
              return (
                <div key={message.id} className="space-y-4 w-full">
                  {/* Show the table instead of the chat message */}
                  <div className="w-full">
                    {/* Results count */}
                    
                    {filteredProposals.length > 0 ? (
                      <ProposalTable
                        proposals={filteredProposals}
                        proposalDescriptions={proposalDescriptions}
                      />
                    ) : (
                      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8 text-center">
                        <div className="text-slate-500 text-lg font-medium mb-2">No proposals found</div>
                        <div className="text-slate-400 text-sm">Try adjusting your filters to see more results</div>
                      </div>
                    )}
                  </div>
                </div>
              )
            }
            
            return (
              <div
                key={message.id}
                className={cn(
                  'flex',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-6 py-4 shadow-sm',
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                      : 'bg-white/90 backdrop-blur-sm border border-slate-200 text-slate-900'
                  )}
                >
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
                  </div>
                  
                  {/* Count pill for count queries */}
                  {message.role === 'assistant' && count !== null && isCountQuery(message.content) && (
                    <div className="mt-3">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                        📊 {filteredProposals.length} results found
                        {filteredProposals.length !== proposals.length && (
                          <span className="ml-2 text-blue-600">
                            (filtered from {proposals.length})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  
                  {/* SQL toggle for SQL queries */}
                  {message.role === 'assistant' && showSql && currentSql && (
                    <div className="mt-3 flex items-center space-x-2">
                      <button
                        onClick={() => setShowSqlDrawer(!showSqlDrawer)}
                        className="inline-flex items-center px-4 py-2 border border-slate-300 shadow-sm text-xs font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      >
                        {showSqlDrawer ? <EyeOff className="w-3 h-3 mr-2" /> : <Eye className="w-3 h-3 mr-2" />}
                        {showSqlDrawer ? 'Hide SQL' : 'Show SQL'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl px-6 py-4 shadow-sm">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <div className="bg-white/80 backdrop-blur-sm border-t border-slate-200 px-6 py-4 shadow-sm">
          <form onSubmit={(e) => {
            e.preventDefault()
            if (input.trim()) {
              // Reset proposals and set loading state
              setProposals([])
              setProposalDescriptions({})
              setCount(null)
              setIsLoadingProposals(true)
              handleSubmit(e)
            }
          }} className="flex space-x-4">
            <div className="flex-1 relative">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Ask about your onchain data..."
                className="w-full border border-slate-300 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90 backdrop-blur-sm shadow-sm text-slate-900 placeholder-slate-500"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Send className="w-4 h-4 text-slate-400" />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg transition-all duration-200 transform hover:scale-105 disabled:transform-none"
            >
              <span className="font-medium">Send</span>
            </button>
          </form>
        </div>
      </div>

      {/* Right Sidebar - Only Filters */}
      <div className="w-80 bg-white/90 backdrop-blur-sm border-l border-slate-200 flex flex-col shadow-xl">
        {/* Filters */}
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900">Filters</h3>
          </div>
            <Filters onApplyFilters={handleApplyFilters} />
        </div>
      </div>

      {/* SQL Drawer */}
      {showSqlDrawer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Database className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Generated SQL</h3>
              </div>
              <button
                onClick={() => setShowSqlDrawer(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-6 overflow-auto">
              <pre className="bg-slate-50 p-4 rounded-xl text-sm overflow-x-auto border border-slate-200">
                <code className="text-slate-800">{currentSql}</code>
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
