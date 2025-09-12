'use client'

import { useChat } from 'ai/react'
import { useState, useEffect } from 'react'
import { Send, Database, Filter, X, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import ResultTable from '@/components/ResultTable'
import Filters from '@/components/Filters'

export default function Home() {
  const [showSqlDrawer, setShowSqlDrawer] = useState(false)
  const [currentSql, setCurrentSql] = useState('')
  const [currentResults, setCurrentResults] = useState<any[]>([])
  const [showSql, setShowSql] = useState(false)
  const [count, setCount] = useState<number | null>(null)
  const [filters, setFilters] = useState({
    network: 'all',
    type: 'all',
    dateRange: '7d'
  })
  
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: {
      filters: filters
    },
    onFinish: (message) => {
      console.log('Message finished:', message)
      // The data will be handled by the useEffect below
    },
    onError: (error) => {
      console.error('Chat error:', error)
    }
  })

  // Handle data extraction from the last message using useEffect
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content) {
      // Try to extract data from the message content if it contains JSON
      try {
        const content = lastMessage.content
        console.log('Checking content for JSON:', content)
        
        // Look for JSON data in the content (array format)
        const jsonMatch = content.match(/\[{.*}\]/)
        if (jsonMatch) {
          const jsonData = JSON.parse(jsonMatch[0])
          console.log('Extracted JSON data:', jsonData)
          
          if (Array.isArray(jsonData)) {
            console.log('Setting results from content array:', jsonData)
            setCurrentResults(jsonData)
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
            console.log('Setting results from Data prefix:', jsonData)
            setCurrentResults(jsonData)
            setCount(jsonData.length)
          }
        }
      } catch (e) {
        console.log('No JSON found in content or parsing error:', e)
      }
    }
  }, [messages]) // Only run when messages change

  // Debug: Log messages changes (only when they actually change)
  useEffect(() => {
    console.log('Current messages:', messages)
    console.log('Current results:', currentResults)
    console.log('Current count:', count)
  }, [messages, currentResults, count])

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
          {messages.map((message) => (
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
                      📊 {count} results found
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
          ))}
          
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
          <form onSubmit={handleSubmit} className="flex space-x-4">
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

      {/* Right Sidebar */}
      <div className="w-96 bg-white/90 backdrop-blur-sm border-l border-slate-200 flex flex-col shadow-xl">
        {/* Filters */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900">Filters</h3>
          </div>
          <Filters onFiltersChange={setFilters} />
        </div>

        {/* Results Table */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Results</h3>
            {count !== null && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {count} found
              </span>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <ResultTable results={currentResults} />
          </div>
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
