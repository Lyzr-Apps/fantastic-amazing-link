'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Plus, Menu, X } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

interface AgentResponse {
  success: boolean
  response?: {
    response?: string
    status?: string
    confidence?: number
    metadata?: {
      intent_detected?: string
      topic?: string
      suggested_followups?: string[]
    }
  }
  raw_response?: string
  agent_id?: string
  user_id?: string
  session_id?: string
}

const CHAT_AGENT_ID = '69303ff22bb6b2ddb363df81'

function getTitleFromMessage(message: string): string {
  return message.substring(0, 40) + (message.length > 40 ? '...' : '')
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'Hello! I\'m your Knowledge Chat Assistant. Ask me anything and I\'ll do my best to help. Feel free to ask follow-up questions and I\'ll maintain the context of our conversation.',
  timestamp: new Date(),
}

const STARTER_QUESTIONS = [
  'What are the benefits of regular exercise?',
  'How can I improve my productivity?',
  'What is machine learning?',
]

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('conversations')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setConversations(parsed)
        if (parsed.length > 0) {
          const lastConv = parsed[0]
          setCurrentConversationId(lastConv.id)
          setMessages(
            lastConv.messages.length > 0
              ? lastConv.messages
              : [WELCOME_MESSAGE]
          )
        }
      } catch {
        console.error('Failed to load conversations')
      }
    }
  }, [])

  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('conversations', JSON.stringify(conversations))
    }
  }, [conversations])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleNewChat = () => {
    const newId = Date.now().toString()
    const newConversation: Conversation = {
      id: newId,
      title: 'New Conversation',
      messages: [WELCOME_MESSAGE],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setConversations([newConversation, ...conversations])
    setCurrentConversationId(newId)
    setMessages([WELCOME_MESSAGE])
    setInputValue('')
  }

  const handleSelectConversation = (convId: string) => {
    setCurrentConversationId(convId)
    const conversation = conversations.find((c) => c.id === convId)
    if (conversation) {
      setMessages(conversation.messages)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInputValue('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputValue,
          agent_id: CHAT_AGENT_ID,
        }),
      })

      const data: AgentResponse = await response.json()

      let assistantContent = 'I apologize, but I was unable to process your request. Please try again.'

      if (data.success && data.response) {
        const responseObj = typeof data.response === 'string'
          ? data.response
          : data.response.response ?? data.response

        assistantContent =
          typeof responseObj === 'string'
            ? responseObj
            : typeof responseObj === 'object' && responseObj !== null
              ? responseObj.response ?? 'No response generated'
              : 'I apologize, but I was unable to process your request. Please try again.'
      } else if (data.raw_response) {
        assistantContent = data.raw_response
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
      }

      const updatedMessages = [...newMessages, assistantMessage]
      setMessages(updatedMessages)

      setConversations((prevConvs) =>
        prevConvs.map((conv) => {
          if (conv.id === currentConversationId) {
            const title =
              conv.title === 'New Conversation'
                ? getTitleFromMessage(inputValue)
                : conv.title

            return {
              ...conv,
              messages: updatedMessages,
              title,
              updatedAt: new Date(),
            }
          }
          return conv
        })
      )
    } catch (error) {
      console.error('Error calling agent:', error)
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content:
          'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date(),
      }
      setMessages([...newMessages, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleStarterQuestion = (question: string) => {
    setInputValue(question)
  }

  const formatTime = (date: Date) => {
    const d = new Date(date)
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  const formatRelativeTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(date).toLocaleDateString()
  }

  return (
    <div className="flex h-screen bg-white">
      <div
        className={`${
          sidebarOpen ? 'w-80' : 'w-0'
        } bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-300 overflow-hidden`}
      >
        <div className="p-4 border-b border-gray-200">
          <Button
            onClick={handleNewChat}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {conversations.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No conversations yet
              </p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    currentConversationId === conv.id
                      ? 'bg-blue-100 border border-blue-300'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {conv.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatRelativeTime(conv.updatedAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              {sidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
            <h1 className="text-xl font-semibold text-gray-900">
              Knowledge Chat Assistant
            </h1>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Start a conversation
                </h2>
                <p className="text-gray-600 mb-6">
                  Ask me anything and I'll help you find the answers
                </p>
                <div className="space-y-2">
                  {STARTER_QUESTIONS.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleStarterQuestion(question)}
                      className="block w-full max-w-md mx-auto p-3 text-left text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xl lg:max-w-2xl ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
                          : 'bg-gray-100 text-gray-900 rounded-2xl rounded-tl-sm'
                      } px-4 py-3 shadow-sm`}
                    >
                      <p className="text-sm leading-relaxed break-words">
                        {msg.content}
                      </p>
                      <p
                        className={`text-xs mt-2 ${
                          msg.role === 'user'
                            ? 'text-blue-100'
                            : 'text-gray-500'
                        }`}
                      >
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-900 rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100" />
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </>
            )}
          </div>
        </ScrollArea>

        <div className="bg-white border-t border-gray-200 p-4">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <Input
                type="text"
                placeholder="Type your message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
                className="flex-1 border-gray-300 text-gray-900 placeholder-gray-500"
              />
              <Button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
