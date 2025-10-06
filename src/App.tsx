import { useState, useEffect, useRef } from 'react'
import { useKV } from '@github/spark/hooks'
import { 
  Plus, Gear, Funnel, Brain, Sparkle, TrendUp, Clock, ChatCircle, Robot, 
  Trophy, Fire, Target, Share, Users, Crown, Lightning, Star,
  Rocket, Heart, ChartBar, Camera, GlobeHemisphereWest, Medal,
  Confetti, GameController, Calendar, MapPin, Microphone, Eye, Atom,
  CheckCircle, ChartLine
} from '@phosphor-icons/react'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
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
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  estimatedMinutes?: number
  aiSuggested?: boolean
  difficulty?: number // 1-5 scale
  energyRequired?: 'low' | 'medium' | 'high'
  mood?: 'focused' | 'creative' | 'routine' | 'social'
  location?: string
  tags?: string[]
  streakContribution?: boolean
  xpValue?: number
}

interface Category {
  id: string
  name: string
  color: string
  icon?: string
  xpMultiplier?: number
}

interface AIInsight {
  type: 'priority' | 'category' | 'productivity' | 'suggestion' | 'warning' | 'celebration'
  title: string
  description: string
  confidence: number
  actionable?: boolean
  taskId?: string
  urgency?: 'low' | 'medium' | 'high'
  visualType?: 'text' | 'chart' | 'animation'
}

interface ProductivityStats {
  totalTasks: number
  completedTasks: number
  averageCompletionTime: number
  mostProductiveCategory: string
  completionRate: number
  peakHours: number[]
  streakDays: number
  totalXP: number
  level: number
  todayTasks: number
  weeklyTasks: number
  monthlyTasks: number
}

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  unlockedAt?: number
  progress?: number
  maxProgress?: number
  xpReward: number
  shareText?: string
}

interface Challenge {
  id: string
  title: string
  description: string
  type: 'daily' | 'weekly' | 'monthly' | 'custom'
  target: number
  current: number
  xpReward: number
  participants: number
  trending: boolean
  endsAt: number
  category?: string
}

interface UserProfile {
  level: number
  xp: number
  xpToNext: number
  streak: number
  longestStreak: number
  totalTasks: number
  joinedAt: number
  achievements: Achievement[]
  currentChallenges: string[]
  productivityDNA: {
    focusType: 'morning' | 'afternoon' | 'evening' | 'night'
    workStyle: 'sprinter' | 'marathoner' | 'steady' | 'burst'
    motivation: 'achievement' | 'social' | 'progress' | 'challenge'
    preferredDifficulty: 'easy' | 'medium' | 'hard' | 'extreme'
  }
}

const defaultCategories: Category[] = [
  { id: 'work', name: 'Work', color: 'bg-blue-500', icon: '💼', xpMultiplier: 1.2 },
  { id: 'personal', name: 'Personal', color: 'bg-green-500', icon: '🏠', xpMultiplier: 1.0 },
  { id: 'health', name: 'Health', color: 'bg-red-500', icon: '❤️', xpMultiplier: 1.5 },
  { id: 'learning', name: 'Learning', color: 'bg-purple-500', icon: '📚', xpMultiplier: 1.8 },
  { id: 'creative', name: 'Creative', color: 'bg-pink-500', icon: '🎨', xpMultiplier: 1.3 }
]

const defaultAchievements: Achievement[] = [
  {
    id: 'first-task',
    title: 'Getting Started',
    description: 'Complete your first task',
    icon: '🎯',
    rarity: 'common',
    xpReward: 10,
    maxProgress: 1,
    shareText: 'Just completed my first task on TaskFlow AI! 🎯'
  },
  {
    id: 'streak-3',
    title: 'On Fire',
    description: 'Maintain a 3-day streak',
    icon: '🔥',
    rarity: 'common',
    xpReward: 50,
    maxProgress: 3,
    shareText: 'I\'m on a 3-day productivity streak! 🔥'
  },
  {
    id: 'streak-7',
    title: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '⚡',
    rarity: 'rare',
    xpReward: 150,
    maxProgress: 7,
    shareText: 'Just hit a 7-day productivity streak! ⚡'
  },
  {
    id: 'ai-master',
    title: 'AI Whisperer',
    description: 'Follow 10 AI recommendations',
    icon: '🧠',
    rarity: 'epic',
    xpReward: 200,
    maxProgress: 10,
    shareText: 'I\'ve mastered AI productivity recommendations! 🧠'
  },
  {
    id: 'speedster',
    title: 'Lightning Fast',
    description: 'Complete 10 tasks in one day',
    icon: '💨',
    rarity: 'rare',
    xpReward: 100,
    maxProgress: 10,
    shareText: 'Crushed 10 tasks in one day! I\'m unstoppable! 💨'
  }
]

const globalChallenges: Challenge[] = [
  {
    id: 'productivity-week',
    title: '7-Day Productivity Challenge',
    description: 'Complete at least 3 tasks every day for a week',
    type: 'weekly',
    target: 21,
    current: 0,
    xpReward: 500,
    participants: 15247,
    trending: true,
    endsAt: Date.now() + 5 * 24 * 60 * 60 * 1000
  },
  {
    id: 'ai-insights',
    title: 'AI Insights Master',
    description: 'Generate and act on 5 AI insights',
    type: 'weekly',
    target: 5,
    current: 0,
    xpReward: 300,
    participants: 8432,
    trending: false,
    endsAt: Date.now() + 3 * 24 * 60 * 60 * 1000
  }
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
  const [userProfile, setUserProfile] = useKV<UserProfile>('userProfile', {
    level: 1,
    xp: 0,
    xpToNext: 100,
    streak: 0,
    longestStreak: 0,
    totalTasks: 0,
    joinedAt: Date.now(),
    achievements: [],
    currentChallenges: [],
    productivityDNA: {
      focusType: 'morning',
      workStyle: 'steady',
      motivation: 'progress',
      preferredDifficulty: 'medium'
    }
  })
  const [achievements, setAchievements] = useKV<Achievement[]>('achievements', defaultAchievements)
  const [showCelebration, setShowCelebration] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showChallenges, setShowChallenges] = useState(false)
  const [showAchievements, setShowAchievements] = useState(false)
  const [challenges] = useState<Challenge[]>(globalChallenges)
  const [lastCompletedTask, setLastCompletedTask] = useState<Task | null>(null)
  const [moodState] = useState<'focused' | 'creative' | 'routine' | 'social'>('focused')

  const colorOptions = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500',
    'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500'
  ]
  
  const addTask = () => {
    if (!newTaskTitle.trim()) return
    
    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      completed: false,
      categoryId: selectedCategory,
      createdAt: Date.now(),
      priority: 'medium',
      difficulty: 2,
      energyRequired: 'medium',
      mood: moodState,
      xpValue: 10
    }
    
    setTasks(current => [...(current || []), newTask])
    setNewTaskTitle('')
    toast.success('Task added successfully!')
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
          
          if (!task.completed) {
            toast.success(`Task completed! 🎉`)
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

  const currentTasks = tasks || []
  const currentCategories = categories || []
  
  const filteredTasks = filterCategory === 'all' 
    ? currentTasks 
    : currentTasks.filter(task => task.categoryId === filterCategory)

  const completedTasks = filteredTasks.filter(task => task.completed)
  const pendingTasks = filteredTasks.filter(task => !task.completed)

  const getCategoryById = (id: string) => currentCategories.find(cat => cat.id === id)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      
      {/* Celebration Overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white p-8 rounded-3xl shadow-2xl animate-bounce">
            <div className="text-6xl text-center mb-4">🎉</div>
            <div className="text-2xl font-bold text-center">Achievement Unlocked!</div>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto p-3 md:p-4 relative z-10">
        {/* Mobile-First Header */}
        <div className="mb-6 md:mb-8">
          {/* Top row - Logo and quick action */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="relative">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                  <Brain className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                {aiInsights.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 md:w-6 md:h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <Sparkle className="w-2 h-2 md:w-3 md:h-3 text-white" />
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  TaskFlow AI
                </h1>
                <p className="text-xs text-muted-foreground hidden md:block">Transform your productivity with AI superpowers</p>
              </div>
            </div>
            
            {/* Mobile AI button */}
            <div className="md:hidden">
              <Button 
                size="sm"
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              >
                <Sparkle className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* User stats row */}
          {userProfile && (
            <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm rounded-xl p-3 md:p-4 shadow-lg border border-white/20 mb-4">
              <div className="flex items-center gap-2 flex-1">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                  <Crown className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-sm md:text-base font-medium text-gray-800">Level {userProfile.level}</div>
                  <div className="text-xs text-gray-600">{userProfile.xp} XP</div>
                </div>
              </div>
              <div className="w-px h-8 bg-gray-300" />
              <div className="flex items-center gap-2">
                <Fire className="w-4 h-4 md:w-5 md:h-5 text-orange-500" />
                <div>
                  <div className="text-sm md:text-base font-medium text-gray-800">{userProfile.streak}</div>
                  <div className="text-xs text-gray-600">day streak</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Quick Stats - Mobile responsive */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 md:gap-4 mb-6">
            <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
              <CardContent className="p-2 md:p-4 text-center">
                <div className="text-lg md:text-2xl font-bold text-blue-600">{currentTasks.length}</div>
                <div className="text-xs text-gray-600">Total</div>
              </CardContent>
            </Card>
            <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
              <CardContent className="p-2 md:p-4 text-center">
                <div className="text-lg md:text-2xl font-bold text-orange-600">{pendingTasks.length}</div>
                <div className="text-xs text-gray-600">Pending</div>
              </CardContent>
            </Card>
            <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
              <CardContent className="p-2 md:p-4 text-center">
                <div className="text-lg md:text-2xl font-bold text-green-600">{completedTasks.length}</div>
                <div className="text-xs text-gray-600">Done</div>
              </CardContent>
            </Card>
            <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
              <CardContent className="p-2 md:p-4 text-center">
                <div className="text-lg md:text-2xl font-bold text-purple-600">
                  {currentTasks.length > 0 ? Math.round((completedTasks.length / currentTasks.length) * 100) : 0}%
                </div>
                <div className="text-xs text-gray-600">Success</div>
              </CardContent>
            </Card>
            <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
              <CardContent className="p-2 md:p-4 text-center">
                <div className="text-lg md:text-2xl font-bold text-yellow-600">
                  {userProfile?.level || 1}
                </div>
                <div className="text-xs text-gray-600">Level</div>
              </CardContent>
            </Card>
            <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
              <CardContent className="p-2 md:p-4 text-center">
                <div className="text-lg md:text-2xl font-bold text-pink-600">
                  {userProfile?.streak || 0}
                </div>
                <div className="text-xs text-gray-600">Streak</div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-white/80 backdrop-blur-md border border-gray-200/50 shadow-lg rounded-2xl p-1">
            <TabsTrigger 
              value="tasks" 
              className="flex items-center justify-center gap-1 md:gap-2 rounded-xl py-3 px-1 md:px-4 text-xs md:text-sm font-medium transition-all duration-200 data-[state=active]:bg-gray-900 data-[state=active]:text-white data-[state=active]:shadow-lg text-gray-600 hover:text-gray-900"
            >
              <CheckCircle className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">Tasks</span>
            </TabsTrigger>
            <TabsTrigger 
              value="insights" 
              className="flex items-center justify-center gap-1 md:gap-2 rounded-xl py-2 px-1 md:px-4 text-xs md:text-sm font-medium transition-all duration-200 data-[state=active]:bg-gray-900 data-[state=active]:text-white data-[state=active]:shadow-lg text-gray-600 hover:text-gray-900"
            >
              <Brain className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">Insights</span>
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="flex items-center justify-center gap-1 md:gap-2 rounded-xl py-2 px-1 md:px-4 text-xs md:text-sm font-medium transition-all duration-200 data-[state=active]:bg-gray-900 data-[state=active]:text-white data-[state=active]:shadow-lg text-gray-600 hover:text-gray-900"
            >
              <ChartLine className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger 
              value="social" 
              className="flex items-center justify-center gap-1 md:gap-2 rounded-xl py-2 px-1 md:px-4 text-xs md:text-sm font-medium transition-all duration-200 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg text-gray-600 hover:text-gray-900"
            >
              <Users className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">Social</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-6">
            {/* Mobile-First Task Input */}
            <Card className="mb-6 bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
              <CardContent className="p-4 md:p-6">
                <div className="space-y-4">
                  {/* Task input row */}
                  <div className="flex gap-2">
                    <Input
                      id="new-task"
                      placeholder="Add a new task..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addTask()}
                      className="flex-1 border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                    />
                    <Button 
                      onClick={addTask}
                      className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg px-3"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Controls row */}
                  <div className="flex flex-col md:flex-row gap-2 md:gap-4">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="border-purple-200">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentCategories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${category.color}`} />
                              <span className="md:inline hidden">{category.icon}</span>
                              <span className="truncate">{category.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="border-purple-200">
                        <SelectValue placeholder="Filter" />
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
                              <span className="md:inline hidden">{category.icon}</span>
                              <span className="truncate">{category.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button variant="outline" className="border-purple-200 md:px-4 px-3">
                      <Gear className="w-4 h-4" />
                      <span className="md:inline hidden ml-2">Categories</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mobile-Friendly Task Lists */}
            <div className="space-y-6">
              {/* Pending Tasks */}
              {pendingTasks.length > 0 && (
                <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-blue-500" />
                      Active Tasks
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                        {pendingTasks.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {pendingTasks.map(task => {
                      const category = getCategoryById(task.categoryId)
                      return (
                        <div key={task.id} className="task-item flex items-start gap-3 p-3 md:p-4 bg-white/50 rounded-lg md:rounded-xl border border-gray-200/50 hover:shadow-lg transition-all duration-200">
                          <Checkbox
                            id={`task-${task.id}`}
                            checked={task.completed}
                            onCheckedChange={() => toggleTask(task.id)}
                            className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500 mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <label 
                              htmlFor={`task-${task.id}`}
                              className="font-medium cursor-pointer text-gray-800 block text-sm md:text-base leading-relaxed"
                            >
                              {task.title}
                            </label>
                            <div className="flex flex-wrap items-center gap-1 md:gap-2 mt-1">
                              {category && (
                                <div className="flex items-center gap-1">
                                  <div className={`w-2 h-2 rounded-full ${category.color}`} />
                                  <span className="text-xs text-gray-500 hidden md:inline">{category.icon}</span>
                                  <span className="text-xs text-gray-500">{category.name}</span>
                                </div>
                              )}
                              {task.priority && task.priority !== 'medium' && (
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs px-1 py-0 h-5 ${
                                    task.priority === 'urgent' ? 'border-red-200 text-red-700 bg-red-50' :
                                    task.priority === 'high' ? 'border-orange-200 text-orange-700 bg-orange-50' :
                                    'border-green-200 text-green-700 bg-green-50'
                                  }`}
                                >
                                  {task.priority}
                                </Badge>
                              )}
                              {task.xpValue && (
                                <Badge variant="outline" className="text-xs px-1 py-0 h-5 bg-yellow-50 border-yellow-200 text-yellow-700">
                                  +{task.xpValue} XP
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deleteTask(task.id)}
                            className="text-gray-400 hover:text-red-500 opacity-60 hover:opacity-100 transition-opacity p-1 h-auto"
                          >
                            ×
                          </Button>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Completed Tasks */}
              {completedTasks.length > 0 && (
                <Card className="bg-white/40 backdrop-blur-sm border-white/20 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="w-5 h-5 text-green-500" />
                      Completed
                      <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                        {completedTasks.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {completedTasks.slice(0, 5).map(task => {
                      const category = getCategoryById(task.categoryId)
                      return (
                        <div key={task.id} className="flex items-center gap-3 p-3 bg-green-50/50 rounded-lg border border-green-200/50">
                          <Checkbox
                            id={`completed-task-${task.id}`}
                            checked={task.completed}
                            onCheckedChange={() => toggleTask(task.id)}
                            className="data-[state=checked]:bg-green-500"
                          />
                          <div className="flex-1 min-w-0">
                            <label 
                              htmlFor={`completed-task-${task.id}`}
                              className="text-sm line-through text-green-600 cursor-pointer opacity-75 block"
                            >
                              {task.title}
                            </label>
                          </div>
                          {category && (
                            <span className="text-xs text-green-600 opacity-75">
                              {category.icon}
                            </span>
                          )}
                        </div>
                      )
                    })}
                    {completedTasks.length > 5 && (
                      <div className="text-center pt-2">
                        <span className="text-xs text-gray-500">
                          +{completedTasks.length - 5} more completed tasks
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Empty State */}
              {filteredTasks.length === 0 && (
                <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
                  <CardContent className="py-16 text-center">
                    <div className="text-8xl mb-6">🚀</div>
                    <h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Ready to Transform Your Productivity?
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Add your first task and watch our AI work its magic to optimize your workflow.
                    </p>
                    <Button 
                      onClick={() => document.getElementById('new-task')?.focus()}
                      className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Task
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="insights">
            <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-500" />
                  AI Productivity Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">AI Insights Coming Soon</h3>
                  <p className="text-gray-600 mb-6">
                    Add more tasks to unlock powerful AI insights about your productivity patterns.
                  </p>
                  <Button className="bg-gradient-to-r from-blue-500 to-purple-500">
                    Generate First Insights
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
              <CardContent className="py-12 text-center">
                <ChartBar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Analytics Coming Soon</h3>
                <p className="text-gray-600">
                  Complete more tasks to unlock detailed analytics and insights.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="social">
            <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  Social Features
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center py-12">
                <div className="text-6xl mb-4">🚀</div>
                <h3 className="text-xl font-bold mb-2">Coming Soon: Social Productivity</h3>
                <p className="text-gray-600 mb-6">
                  Share achievements, compete with friends, and join global productivity challenges.
                </p>
                <div className="space-x-2">
                  <Button variant="outline">
                    <Share className="w-4 h-4 mr-2" />
                    Share Achievement
                  </Button>
                  <Button variant="outline">
                    <Trophy className="w-4 h-4 mr-2" />
                    View Leaderboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default App