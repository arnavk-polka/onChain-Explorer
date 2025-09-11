import { StreamingTextResponse } from 'ai'

const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function POST(req: Request) {
  const { messages, filters } = await req.json()
  const lastMessage = messages[messages.length - 1]

  try {
    // Forward the query to our server's non-streaming endpoint first
    const response = await fetch(`${BASE_API_URL}/api/v1/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: lastMessage.content,
        filters: filters || {}
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to process query')
    }

    const data = await response.json()
    console.log('Backend response:', data)

    // Create a simple streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        // Simulate streaming by sending the response in chunks
        const responseText = data.response || 'No response received'
        const words = responseText.split(' ')
        
        for (const word of words) {
          controller.enqueue(encoder.encode(word + ' '))
          await new Promise(resolve => setTimeout(resolve, 50))
        }
        
        // Add the results data to the response
        if (data.results && data.results.length > 0) {
          const resultsData = JSON.stringify(data.results)
          controller.enqueue(encoder.encode(`\n\nData: ${resultsData}`))
        }
        
        controller.close()
      },
    })

    // Return the streaming response with data
    return new StreamingTextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })

  } catch (error) {
    console.error('API error:', error)
    
    // Return error response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('❌ Error processing your request'))
        controller.close()
      },
    })

    return new StreamingTextResponse(stream, {
      status: 500,
    })
  }
}
