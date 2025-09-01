'use client'

import { useChat } from 'ai/react'
import { useState } from 'react'
import { Send, Database, Filter, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import ResultTable from '@/components/ResultTable'
import Filters from '@/components/Filters'

export default function Home() {
  const [showSqlDrawer, setShowSqlDrawer] = useState(false)
  const [currentSql, setCurrentSql] = useState('')
  const [currentResults, setCurrentResults] = useState<any[]>([])
  
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    onFinish: (message) => {
      // Extract SQL and results from the message if available
      if (message.data) {
        const data = message.data as any
        if (data.sql_query) {
          setCurrentSql(data.sql_query)
          setShowSqlDrawer(true)
        }
        if (data.results) {
          setCurrentResults(data.results)
        }
      }
    },
  })

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Onchain Explorer</h1>
          <p className="text-gray-600">Ask questions about your onchain data</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
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
                  'max-w-[80%] rounded-lg px-4 py-2',
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-900'
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <form onSubmit={handleSubmit} className="flex space-x-4">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Ask about your onchain data..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        {/* Filters */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
          <Filters />
        </div>

        {/* Results Table */}
        <div className="flex-1 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Results</h3>
          <ResultTable results={currentResults} />
        </div>
      </div>

      {/* SQL Drawer */}
      {showSqlDrawer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Generated SQL</h3>
              </div>
              <button
                onClick={() => setShowSqlDrawer(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                <code>{currentSql}</code>
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
