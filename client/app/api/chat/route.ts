import { StreamingTextResponse, Message } from 'ai'
import { experimental_StreamData } from 'ai'

export async function POST(req: Request) {
  const { messages } = await req.json()
  const lastMessage = messages[messages.length - 1]

  // Forward the query to our server
  const response = await fetch('http://localhost:8000/api/v1/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: lastMessage.content,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to process query')
  }

  const data = await response.json()
  
  // Create streaming response
  const data_stream = new experimental_StreamData()
  
  // Simulate streaming by sending the response in chunks
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const responseText = data.response
      const chunks = responseText.split(' ')
      
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk + ' '))
        await new Promise(resolve => setTimeout(resolve, 50)) // Simulate streaming delay
      }
      
      // Add SQL query and results to stream data if available
      if (data.sql_query) {
        data_stream.append({ sql_query: data.sql_query })
      }
      if (data.results) {
        data_stream.append({ results: data.results })
      }
      
      data_stream.close()
      controller.close()
    },
  })

  return new StreamingTextResponse(stream, {}, data_stream)
}
