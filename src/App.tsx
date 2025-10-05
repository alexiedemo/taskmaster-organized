import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Plus, Gear, Funnel, Brain, Sparkle, TrendUp, Clock, ChatCircle, Robot } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

declare global {
  interface Window {
    spark: {
      llmPrompt: (strings: TemplateStringsArray, ...values: any[]) => string
      llm: (prompt: string, modelName?: string, jsonMode?: boolean) => Promise<string>
    }
  }
}

const spark = window.spark

interface Task {
  id: string
  title: string
  completed: boolean
  categoryId: string
  createdAt: number
  completedAt?: number
  priority?: 'low' | 'medium' | 'high'
  estimatedMinutes?: number
  aiSuggested?: boolean
}

interface Category {
  id: string
  name: string
  color: string
}

interface AIInsight {
  type: 'priority' | 'category' | 'productivity' | 'suggestion'
  title: string
  description: string
  confidence: number
  actionable?: boolean
  taskId?: string
}

interface ProductivityStats {
  totalTasks: number
  completedTasks: number
  averageCompletionTime: number
  mostProductiveCategory: string
  completionRate: number
  peakHours: number[]
}

const defaultCategories: Category[] = [
  { id: 'work', name: 'Work', color: 'bg-blue-500' },
  { id: 'personal', name: 'Personal', color: 'bg-green-500' },
  { id: 'shopping', name: 'Shopping', color: 'bg-purple-500' },
  { id: 'health', name: 'Health', color: 'bg-red-500' }
]

function App() {
  const [tasks, setTasks] = useKV<Task[]>('tasks', [])
  const [categories, setCategories] = useKV<Category[]>('categories', defaultCategories)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('work')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState('bg-gray-500')
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [showAIChat, setShowAIChat] = useState(false)
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', message: string}[]>([])
  const [productivityStats, setProductivityStats] = useState<ProductivityStats | null>(null)

  const colorOptions = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500',
    'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500'
  ]

  // AI-powered functions
  const generateAIInsights = async () => {
    if (!tasks || tasks.length < 3) return // Need some data for meaningful insights
    
    setIsAnalyzing(true)
    try {
      const taskData = tasks.map(t => ({
        title: t.title,
        category: categories?.find(c => c.id === t.categoryId)?.name || 'Unknown',
        completed: t.completed,
        createdAt: t.createdAt,
        completedAt: t.completedAt
      }))

      const prompt = spark.llmPrompt`
        Analyze these tasks and provide 3-4 actionable insights to help improve productivity:
        
        Tasks: ${JSON.stringify(taskData)}
        
        Focus on:
        1. Task prioritization recommendations
        2. Category organization suggestions  
        3. Productivity pattern insights
        4. Specific task suggestions
        
        Return insights as JSON in this format:
        {
          "insights": [
            {
              "type": "priority|category|productivity|suggestion",
              "title": "Brief insight title",
              "description": "Detailed explanation and recommendation", 
              "confidence": 0.8,
              "actionable": true
            }
          ]
        }
      `
      
      const response = await spark.llm(prompt, "gpt-4o", true)
      const data = JSON.parse(response)
      setAiInsights(data.insights || [])
      
    } catch (error) {
      console.error('AI analysis failed:', error)
      toast.error('AI analysis failed. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const suggestTaskCategory = async (taskTitle: string) => {
    if (!taskTitle.trim() || !categories) return selectedCategory
    
    try {
      const categoryNames = categories.map(c => c.name)
      const prompt = spark.llmPrompt`
        Given this task: "${taskTitle}"
        And these available categories: ${categoryNames.join(', ')}
        
        Which category best fits this task? Respond with just the category name.
      `
      
      const response = await spark.llm(prompt, "gpt-4o-mini")
      const suggestedCategory = categories.find(c => 
        c.name.toLowerCase() === response.toLowerCase().trim()
      )
      
      return suggestedCategory?.id || selectedCategory
    } catch (error) {
      return selectedCategory
    }
  }

  const handleAIChat = async () => {
    if (!chatMessage.trim()) return
    
    const userMessage = chatMessage
    setChatMessage('')
    setChatHistory(prev => [...prev, { role: 'user', message: userMessage }])
    
    try {
      const currentTasksData = tasks?.map(t => ({
        title: t.title,
        completed: t.completed,
        category: categories?.find(c => c.id === t.categoryId)?.name
      })) || []

      const prompt = spark.llmPrompt`
        You are an AI productivity assistant helping with task management. 
        
        Current tasks: ${JSON.stringify(currentTasksData)}
        Available categories: ${categories?.map(c => c.name).join(', ')}
        
        User message: "${userMessage}"
        
        Provide helpful, actionable advice about task management, productivity, or specific task recommendations. 
        Keep responses concise and friendly.
      `
      
      const response = await spark.llm(prompt, "gpt-4o")
      setChatHistory(prev => [...prev, { role: 'ai', message: response }])
      
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'ai', message: 'Sorry, I encountered an error. Please try again.' }])
    }
  }

  const generateTaskSuggestions = async () => {
    if (!tasks || !categories) return
    
    try {
      const currentTasksData = tasks.filter(t => !t.completed).map(t => ({
        title: t.title,
        category: categories.find(c => c.id === t.categoryId)?.name
      }))

      const prompt = spark.llmPrompt`
        Based on these current tasks: ${JSON.stringify(currentTasksData)}
        And categories: ${categories.map(c => c.name).join(', ')}
        
        Suggest 3 relevant tasks that would complement the current workload. 
        Return as JSON:
        {
          "suggestions": [
            {
              "title": "Task title",
              "category": "Category name",
              "priority": "low|medium|high",
              "estimatedMinutes": 30
            }
          ]
        }
      `
      
      const response = await spark.llm(prompt, "gpt-4o", true)
      const data = JSON.parse(response)
      
      return data.suggestions || []
    } catch (error) {
      console.error('Failed to generate suggestions:', error)
      return []
    }
  }

  const calculateProductivityStats = () => {
    if (!tasks || tasks.length === 0) return null

    const completed = tasks.filter(t => t.completed)
    const completionTimes = completed
      .filter(t => t.completedAt && t.createdAt)
      .map(t => (t.completedAt! - t.createdAt) / (1000 * 60)) // minutes

    const categoryStats = categories?.map(cat => ({
      category: cat.name,
      completed: completed.filter(t => t.categoryId === cat.id).length,
      total: tasks.filter(t => t.categoryId === cat.id).length
    })) || []

    const mostProductive = categoryStats.reduce((max, cat) => 
      cat.completed > max.completed ? cat : max, categoryStats[0] || { category: 'None', completed: 0 })

    const completedHours = completed
      .filter(t => t.completedAt)
      .map(t => new Date(t.completedAt!).getHours())
    
    const hourCounts = completedHours.reduce((acc, hour) => {
      acc[hour] = (acc[hour] || 0) + 1
      return acc
    }, {} as Record<number, number>)

    const peakHours = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour))

    return {
      totalTasks: tasks.length,
      completedTasks: completed.length,
      averageCompletionTime: completionTimes.length > 0 
        ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length 
        : 0,
      mostProductiveCategory: mostProductive.category,
      completionRate: tasks.length > 0 ? (completed.length / tasks.length) * 100 : 0,
      peakHours
    }
  }

  // Update productivity stats when tasks change
  useEffect(() => {
    const stats = calculateProductivityStats()
    setProductivityStats(stats)
  }, [tasks, categories])

  // Generate initial AI insights
  useEffect(() => {
    if (tasks && tasks.length >= 3 && aiInsights.length === 0) {
      generateAIInsights()
    }
  }, [tasks])

  const addTask = async () => {
    if (!newTaskTitle.trim()) return
    
    // Get AI category suggestion
    const suggestedCategoryId = await suggestTaskCategory(newTaskTitle)
    
    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      completed: false,
      categoryId: suggestedCategoryId,
      createdAt: Date.now(),
      priority: 'medium' // Default priority
    }
    
    setTasks(current => [...(current || []), newTask])
    setNewTaskTitle('')
    
    // Show suggestion feedback if AI suggested different category
    if (suggestedCategoryId !== selectedCategory) {
      const suggestedCategory = categories?.find(c => c.id === suggestedCategoryId)
      toast.success(`Task added! AI suggested "${suggestedCategory?.name}" category`, {
        action: {
          label: 'Learn more',
          onClick: () => generateAIInsights()
        }
      })
    } else {
      toast.success('Task added successfully!')
    }
  }

  const toggleTask = (taskId: string) => {
    setTasks(current => 
      (current || []).map(task => {
        if (task.id === taskId) {
          const updated = { 
            ...task, 
            completed: !task.completed,
            completedAt: !task.completed ? Date.now() : undefined
          }
          
          // Celebrate completion and suggest insights
          if (!task.completed) {
            toast.success('Task completed! 🎉', {
              action: {
                label: 'View insights',
                onClick: () => generateAIInsights()
              }
            })
          }
          
          return updated
        }
        return task
      })
    )
  }

  const deleteTask = (taskId: string) => {
    setTasks(current => (current || []).filter(task => task.id !== taskId))
    toast.success('Task deleted')
  }

  const addCategory = () => {
    if (!newCategoryName.trim()) return
    
    const newCategory: Category = {
      id: Date.now().toString(),
      name: newCategoryName.trim(),
      color: newCategoryColor
    }
    
    setCategories(current => [...(current || []), newCategory])
    setNewCategoryName('')
    setNewCategoryColor('bg-gray-500')
    toast.success('Category added!')
  }

  const deleteCategory = (categoryId: string) => {
    const currentCategories = categories || []
    if (currentCategories.length <= 1) {
      toast.error('Cannot delete the last category')
      return
    }
    
    const remainingCategories = currentCategories.filter(cat => cat.id !== categoryId)
    setCategories(remainingCategories)
    
    // Move tasks from deleted category to first remaining category
    const firstRemainingCategory = remainingCategories[0]
    setTasks(current => 
      (current || []).map(task => 
        task.categoryId === categoryId 
          ? { ...task, categoryId: firstRemainingCategory.id }
          : task
      )
    )
    
    toast.success('Category deleted')
  }

  const currentTasks = tasks || []
  const currentCategories = categories || []
  
  const filteredTasks = filterCategory === 'all' 
    ? currentTasks 
    : currentTasks.filter(task => task.categoryId === filterCategory)

  const completedTasks = filteredTasks.filter(task => task.completed)
  const pendingTasks = filteredTasks.filter(task => !task.completed)

  const getCategoryById = (id: string) => currentCategories.find(cat => cat.id === id)

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
                TaskFlow AI
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-white" />
                </div>
              </h1>
              <p className="text-muted-foreground">AI-powered task management with intelligent insights</p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={generateAIInsights} 
                disabled={isAnalyzing || !tasks || tasks.length < 3}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkle className="w-4 h-4 mr-2" />
                    AI Insights
                  </>
                )}
              </Button>
              <Dialog open={showAIChat} onOpenChange={setShowAIChat}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <ChatCircle className="w-4 h-4 mr-2" />
                    AI Assistant
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Robot className="w-5 h-5 text-purple-500" />
                      AI Task Assistant
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {chatHistory.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-4">
                          Ask me anything about your tasks or productivity!
                        </div>
                      ) : (
                        chatHistory.map((msg, idx) => (
                          <div key={idx} className={`p-2 rounded-lg text-sm ${
                            msg.role === 'user' 
                              ? 'bg-primary text-primary-foreground ml-4' 
                              : 'bg-muted mr-4'
                          }`}>
                            {msg.message}
                          </div>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ask about your tasks..."
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAIChat()}
                      />
                      <Button onClick={handleAIChat} size="sm">
                        Send
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-primary">{currentTasks.length}</div>
                  <div className="text-sm text-muted-foreground">Total Tasks</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-accent">{pendingTasks.length}</div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">{completedTasks.length}</div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-purple-600">
                    {productivityStats ? Math.round(productivityStats.completionRate) : 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">Completion Rate</div>
                </CardContent>
              </Card>
            </div>

            {/* AI Insights Preview */}
            {aiInsights.length > 0 && (
              <Card className="mb-6 border-purple-200 bg-gradient-to-r from-blue-50 to-purple-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-700">
                    <Brain className="w-5 h-5" />
                    Quick AI Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    {aiInsights.slice(0, 2).map((insight, idx) => (
                      <div key={idx} className="text-sm">
                        <div className="font-medium text-purple-800">{insight.title}</div>
                        <div className="text-purple-600">{insight.description}</div>
                      </div>
                    ))}
                    {aiInsights.length > 2 && (
                      <Button variant="link" className="justify-start p-0 h-auto text-purple-600" onClick={() => {}}>
                        View all {aiInsights.length} insights →
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Controls */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Add Task Form */}
                  <div className="flex-1 flex gap-2">
                    <Input
                      id="new-task"
                      placeholder="Add a new task... (AI will suggest the best category)"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addTask()}
                      className="flex-1"
                    />
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currentCategories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${category.color}`} />
                              {category.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={addTask}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Filter and Settings */}
                  <div className="flex gap-2">
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          <div className="flex items-center gap-2">
                            <Funnel className="w-3 h-3" />
                            All Categories
                          </div>
                        </SelectItem>
                        {currentCategories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${category.color}`} />
                              {category.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          <Gear className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Manage Categories</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          {/* Add New Category */}
                          <div className="space-y-2">
                            <Label htmlFor="category-name">Add New Category</Label>
                            <div className="flex gap-2">
                              <Input
                                id="category-name"
                                placeholder="Category name"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                              />
                              <Select value={newCategoryColor} onValueChange={setNewCategoryColor}>
                                <SelectTrigger className="w-20">
                                  <div className={`w-4 h-4 rounded-full ${newCategoryColor}`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {colorOptions.map(color => (
                                    <SelectItem key={color} value={color}>
                                      <div className={`w-4 h-4 rounded-full ${color}`} />
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button onClick={addCategory}>Add</Button>
                            </div>
                          </div>

                          {/* Existing Categories */}
                          <div className="space-y-2">
                            <Label>Existing Categories</Label>
                            <div className="space-y-2">
                              {currentCategories.map(category => (
                                <div key={category.id} className="flex items-center justify-between p-2 border rounded">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-4 h-4 rounded-full ${category.color}`} />
                                    <span>{category.name}</span>
                                  </div>
                                  <Button 
                                    variant="destructive" 
                                    size="sm"
                                    onClick={() => deleteCategory(category.id)}
                                    disabled={currentCategories.length <= 1}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tasks */}
            <div className="space-y-6">
              {/* Pending Tasks */}
              {pendingTasks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      Pending Tasks
                      <Badge variant="secondary">{pendingTasks.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {pendingTasks.map(task => {
                      const category = getCategoryById(task.categoryId)
                      return (
                        <div key={task.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <Checkbox
                            id={`task-${task.id}`}
                            checked={task.completed}
                            onCheckedChange={() => toggleTask(task.id)}
                          />
                          <div className="flex-1">
                            <label 
                              htmlFor={`task-${task.id}`}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {task.title}
                            </label>
                            {task.aiSuggested && (
                              <Badge variant="outline" className="ml-2 text-xs bg-purple-50 text-purple-600">
                                <Sparkle className="w-3 h-3 mr-1" />
                                AI Suggested
                              </Badge>
                            )}
                          </div>
                          {category && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${category.color}`} />
                              {category.name}
                            </Badge>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deleteTask(task.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            Delete
                          </Button>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Completed Tasks */}
              {completedTasks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      Completed Tasks
                      <Badge variant="outline">{completedTasks.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {completedTasks.map(task => {
                      const category = getCategoryById(task.categoryId)
                      return (
                        <div key={task.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                          <Checkbox
                            id={`completed-task-${task.id}`}
                            checked={task.completed}
                            onCheckedChange={() => toggleTask(task.id)}
                          />
                          <div className="flex-1">
                            <label 
                              htmlFor={`completed-task-${task.id}`}
                              className="text-sm line-through text-muted-foreground cursor-pointer"
                            >
                              {task.title}
                            </label>
                          </div>
                          {category && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${category.color}`} />
                              {category.name}
                            </Badge>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deleteTask(task.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            Delete
                          </Button>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Empty State */}
              {filteredTasks.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <div className="text-6xl mb-4">✨</div>
                    <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
                    <p className="text-muted-foreground mb-4">
                      {filterCategory === 'all' 
                        ? "Add your first task to get started!"
                        : `No tasks in ${getCategoryById(filterCategory)?.name} category`}
                    </p>
                    <Button onClick={() => setFilterCategory('all')} variant="outline">
                      {filterCategory === 'all' ? 'Add a task above' : 'View all tasks'}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="insights">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-500" />
                    AI Productivity Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {aiInsights.length === 0 ? (
                    <div className="text-center py-8">
                      <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-medium mb-2">No insights yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Add at least 3 tasks to get AI-powered insights about your productivity patterns.
                      </p>
                      <Button 
                        onClick={generateAIInsights} 
                        disabled={!tasks || tasks.length < 3}
                        className="bg-gradient-to-r from-blue-500 to-purple-500"
                      >
                        Generate Insights
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {aiInsights.map((insight, idx) => (
                        <Card key={idx} className="border-l-4 border-l-purple-500">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium text-purple-800">{insight.title}</h4>
                              <Badge variant="secondary">
                                {Math.round(insight.confidence * 100)}% confidence
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
                            {insight.actionable && (
                              <Badge variant="outline" className="text-green-600">
                                Actionable
                              </Badge>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      <Button 
                        onClick={generateAIInsights} 
                        variant="outline"
                        className="w-full"
                      >
                        <Sparkle className="w-4 h-4 mr-2" />
                        Refresh Insights
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="space-y-6">
              {productivityStats ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendUp className="w-5 h-5 text-green-500" />
                          Productivity Overview
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Completion Rate</span>
                            <span className="text-sm font-medium">{Math.round(productivityStats.completionRate)}%</span>
                          </div>
                          <Progress value={productivityStats.completionRate} className="h-2" />
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold text-primary">{productivityStats.completedTasks}</div>
                            <div className="text-xs text-muted-foreground">Completed</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-accent">{productivityStats.totalTasks - productivityStats.completedTasks}</div>
                            <div className="text-xs text-muted-foreground">Remaining</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="w-5 h-5 text-blue-500" />
                          Time Insights
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Average Completion Time</div>
                          <div className="text-2xl font-bold">
                            {productivityStats.averageCompletionTime > 0 
                              ? `${Math.round(productivityStats.averageCompletionTime)}m`
                              : 'No data'
                            }
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Most Productive Category</div>
                          <div className="font-medium">{productivityStats.mostProductiveCategory}</div>
                        </div>
                        {productivityStats.peakHours.length > 0 && (
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">Peak Hours</div>
                            <div className="font-medium">
                              {productivityStats.peakHours.map(hour => `${hour}:00`).join(', ')}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <TrendUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium mb-2">No analytics yet</h3>
                    <p className="text-muted-foreground">
                      Complete some tasks to see productivity analytics and patterns.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default App