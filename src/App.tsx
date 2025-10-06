import { useState, useEffect, useRef } from 'react'
import { useKV } from '@github/spark/hooks'
import { 
  Plus, Gear, Funnel, Brain, Sparkle, TrendUp, Clock, ChatCircle, Robot, 
  Trophy, Fire, Target, Share, Users, Crown, Lightning, Star,
  Rocket, Heart, ChartBar, Camera, GlobeHemisphereWest, Medal,
  Confetti, GameController, Calendar, MapPin, Microphone, Eye, Atom,
  CheckCircle, ChartLine, MagicWand, Compass, VideoCamera, Palette,
  Headphones, ShootingStar, Storefront, PaintBrush, Mountains, Webcam,
  Bell, Database, Download, Trash
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
  const [showSettings, setShowSettings] = useState(false)
  const [autoAI, setAutoAI] = useKV<boolean>('autoAI', true)
  const [darkMode, setDarkMode] = useKV<boolean>('darkMode', false)
  const [notifications, setNotifications] = useKV<boolean>('notifications', true)
  const [soundEffects, setSoundEffects] = useKV<boolean>('soundEffects', true)
  const [autoCategories, setAutoCategories] = useKV<boolean>('autoCategories', true)
  const [aiPersonality, setAiPersonality] = useKV<string>('aiPersonality', 'helpful')

  const colorOptions = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500',
    'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500'
  ]
  
  const addTask = async () => {
    if (!newTaskTitle.trim()) return
    
    // Smart category suggestion when enabled
    let suggestedCategory = selectedCategory
    if (autoCategories && newTaskTitle.trim()) {
      const taskLower = newTaskTitle.toLowerCase()
      if (taskLower.includes('work') || taskLower.includes('meeting') || taskLower.includes('project')) {
        suggestedCategory = 'work'
      } else if (taskLower.includes('exercise') || taskLower.includes('health') || taskLower.includes('doctor')) {
        suggestedCategory = 'health'
      } else if (taskLower.includes('learn') || taskLower.includes('study') || taskLower.includes('read')) {
        suggestedCategory = 'learning'
      } else if (taskLower.includes('create') || taskLower.includes('design') || taskLower.includes('art')) {
        suggestedCategory = 'creative'
      } else if (taskLower.includes('home') || taskLower.includes('family') || taskLower.includes('personal')) {
        suggestedCategory = 'personal'
      }
    }
    
    // Enhanced task creation with AI-powered suggestions
    const baseXP = 10
    const category = currentCategories.find(cat => cat.id === suggestedCategory)
    const xpValue = Math.round(baseXP * (category?.xpMultiplier || 1))
    
    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      completed: false,
      categoryId: suggestedCategory,
      createdAt: Date.now(),
      priority: 'medium',
      difficulty: 2,
      energyRequired: 'medium',
      mood: moodState,
      xpValue,
      estimatedMinutes: 30,
      streakContribution: true
    }
    
    setTasks(current => [...(current || []), newTask])
    setNewTaskTitle('')
    
    // Generate AI insight for the new task
    if (currentTasks.length >= 1 && autoAI) {
      setTimeout(() => generateProductivityInsight(), 500)
    }
    
    // Show smart categorization feedback
    if (autoCategories && suggestedCategory !== selectedCategory) {
      toast.success(`Task added to ${category?.name} category! +${xpValue} XP when completed`)
    } else {
      toast.success(`Task added! +${xpValue} XP when completed`)
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
          
          if (!task.completed) {
            // Award XP and update user profile
            const xpGained = task.xpValue || 10
            setUserProfile(currentProfile => {
              if (!currentProfile) return {
                level: 1,
                xp: xpGained,
                xpToNext: 100 - xpGained,
                streak: 0,
                longestStreak: 0,
                totalTasks: 1,
                joinedAt: Date.now(),
                achievements: [],
                currentChallenges: [],
                productivityDNA: {
                  focusType: 'morning',
                  workStyle: 'steady',
                  motivation: 'progress',
                  preferredDifficulty: 'medium'
                }
              }
              
              const newXP = currentProfile.xp + xpGained
              const newLevel = Math.floor(newXP / 100) + 1
              const leveledUp = newLevel > currentProfile.level
              
              // Check for achievements
              checkAchievements(currentProfile, task)
              
              if (leveledUp) {
                setTimeout(() => {
                  toast.success(`🎉 Level Up! You're now level ${newLevel}!`)
                  setShowCelebration(true)
                  setTimeout(() => setShowCelebration(false), 2000)
                }, 100)
              }
              
              return {
                ...currentProfile,
                xp: newXP,
                level: newLevel,
                xpToNext: 100 - (newXP % 100),
                totalTasks: currentProfile.totalTasks + 1
              }
            })
            
            toast.success(`Task completed! +${xpGained} XP 🎉`)
            setLastCompletedTask(task)
            
            // Play completion sound if enabled
            if (soundEffects) {
              // Create a simple success sound
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
              const oscillator = audioContext.createOscillator()
              const gainNode = audioContext.createGain()
              
              oscillator.connect(gainNode)
              gainNode.connect(audioContext.destination)
              
              oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime) // C5
              oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1) // E5
              oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2) // G5
              
              gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
              
              oscillator.start(audioContext.currentTime)
              oscillator.stop(audioContext.currentTime + 0.3)
            }
          }
          
          return updated
        }
        return task
      })
    )
  }

  const checkAchievements = (profile: UserProfile, completedTask: Task) => {
    const completedCount = currentTasks.filter(t => t.completed).length + 1
    
    // Check for first task achievement
    if (completedCount === 1) {
      unlockAchievement('first-task')
    }
    
    // Check for speed achievements
    if (completedCount >= 10) {
      const today = new Date().toDateString()
      const todayTasks = currentTasks.filter(t => 
        t.completed && t.completedAt && 
        new Date(t.completedAt).toDateString() === today
      ).length + 1
      
      if (todayTasks >= 10) {
        unlockAchievement('speedster')
      }
    }
  }

  const unlockAchievement = (achievementId: string) => {
    setAchievements(current => 
      (current || []).map(achievement => {
        if (achievement.id === achievementId && !achievement.unlockedAt) {
          toast.success(`🏆 Achievement Unlocked: ${achievement.title}!`)
          return {
            ...achievement,
            unlockedAt: Date.now(),
            progress: achievement.maxProgress
          }
        }
        return achievement
      })
    )
  }

  const generateProductivityInsight = async () => {
    if (currentTasks.length < 2) return
    
    try {
      setIsAnalyzing(true)
      
      const completedCount = currentTasks.filter(t => t.completed).length
      const pendingCount = currentTasks.filter(t => !t.completed).length
      const categories = currentTasks.map(t => getCategoryById(t.categoryId)?.name).filter(Boolean)
      const topCategory = categories.reduce((a, b, i, arr) => 
        arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b, categories[0]
      )
      
      const prompt = spark.llmPrompt`Analyze this productivity data and provide 1 actionable insight:
      - Total tasks: ${currentTasks.length}
      - Completed: ${completedCount}
      - Pending: ${pendingCount}
      - Most used category: ${topCategory}
      - Current level: ${userProfile?.level || 1}
      
      Provide a specific, encouraging insight about their productivity patterns and one actionable suggestion to improve. Keep it under 50 words.`
      
      const insight = await spark.llm(prompt, 'gpt-4o-mini')
      
      const newInsight: AIInsight = {
        type: 'productivity',
        title: 'Productivity Pattern Analysis',
        description: insight,
        confidence: 90,
        actionable: true,
        urgency: 'medium'
      }
      
      setAiInsights(current => [newInsight, ...current.slice(0, 4)])
      toast.success('AI insight generated!')
    } catch (error) {
      toast.error('Failed to generate insight. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white p-8 rounded-3xl shadow-2xl animate-bounce max-w-sm mx-4">
            <div className="text-center">
              <div className="text-5xl mb-4">🎉</div>
              <div className="text-xl font-bold mb-2">Level Up!</div>
              <div className="text-sm opacity-90">You've reached level {userProfile?.level || 1}!</div>
              <div className="mt-4 text-xs opacity-75">Keep up the amazing work!</div>
            </div>
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
          <TabsList className="text-muted-foreground h-12 items-center justify-center grid w-full grid-cols-4 bg-white/80 backdrop-blur-md border border-gray-200/50 shadow-lg rounded-xl p-1 font-semibold text-5xl">
            <TabsTrigger 
              value="tasks" 
              className="flex items-center justify-center gap-1 rounded-lg py-1.5 md:py-2 px-2 md:px-3 transition-all duration-200 data-[state=active]:bg-gray-900 data-[state=active]:text-white data-[state=active]:shadow-lg text-gray-600 hover:text-gray-900 font-semibold text-xs"
            >
              <CheckCircle className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Tasks</span>
            </TabsTrigger>
            <TabsTrigger 
              value="insights" 
              className="flex items-center justify-center gap-1 rounded-lg py-1.5 md:py-2 px-2 md:px-3 text-xs font-medium transition-all duration-200 data-[state=active]:bg-gray-900 data-[state=active]:text-white data-[state=active]:shadow-lg text-gray-600 hover:text-gray-900"
            >
              <Brain className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Insights</span>
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="flex items-center justify-center gap-1 rounded-lg py-1.5 md:py-2 px-2 md:px-3 text-xs font-medium transition-all duration-200 data-[state=active]:bg-gray-900 data-[state=active]:text-white data-[state=active]:shadow-lg text-gray-600 hover:text-gray-900"
            >
              <ChartLine className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger 
              value="social" 
              className="flex items-center justify-center gap-1 rounded-lg py-1.5 md:py-2 px-2 md:px-3 text-xs font-medium transition-all duration-200 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg text-gray-600 hover:text-gray-900"
            >
              <Users className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Social</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-4">
            {/* Mobile-First Task Input */}
            <Card className="mb-4 bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
              <CardContent className="p-3 md:p-4">
                <div className="space-y-3">
                  {/* Task input row */}
                  <div className="flex gap-2">
                    <Input
                      id="new-task"
                      placeholder="Add a new task..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addTask()}
                      className="flex-1 border-purple-200 focus:border-purple-400 focus:ring-purple-400 text-sm"
                    />
                    <Button 
                      onClick={addTask}
                      size="sm"
                      className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg px-3"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Controls row */}
                  <div className="flex flex-col md:flex-row gap-2">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="border-purple-200 text-sm h-8">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentCategories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${category.color}`} />
                              <span className="md:inline hidden text-xs">{category.icon}</span>
                              <span className="truncate text-sm">{category.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="border-purple-200 text-sm h-8">
                        <SelectValue placeholder="Filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          <div className="flex items-center gap-2">
                            <Funnel className="w-3 h-3" />
                            <span className="text-sm">All Categories</span>
                          </div>
                        </SelectItem>
                        {currentCategories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${category.color}`} />
                              <span className="md:inline hidden text-xs">{category.icon}</span>
                              <span className="truncate text-sm">{category.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Dialog open={showSettings} onOpenChange={setShowSettings}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="border-purple-200 h-8 px-3">
                          <Gear className="w-3 h-3" />
                          <span className="md:inline hidden ml-2 text-sm">Settings</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Gear className="w-4 h-4" />
                            TaskFlow Settings
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          {/* AI Settings */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              <Brain className="w-4 h-4 text-purple-500" />
                              AI Features
                            </h4>
                            <div className="space-y-3 pl-6">
                              <div className="flex items-center justify-between">
                                <Label htmlFor="auto-ai" className="text-sm">Auto-generate insights</Label>
                                <Switch
                                  id="auto-ai"
                                  checked={autoAI}
                                  onCheckedChange={setAutoAI}
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <Label htmlFor="auto-categories" className="text-sm">Smart categorization</Label>
                                <Switch
                                  id="auto-categories"
                                  checked={autoCategories}
                                  onCheckedChange={setAutoCategories}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="ai-personality" className="text-sm">AI Personality</Label>
                                <Select value={aiPersonality} onValueChange={setAiPersonality}>
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="helpful">Helpful Coach</SelectItem>
                                    <SelectItem value="motivational">Motivational Trainer</SelectItem>
                                    <SelectItem value="analytical">Analytical Advisor</SelectItem>
                                    <SelectItem value="friendly">Friendly Companion</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>

                          {/* Appearance */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              <Palette className="w-4 h-4 text-blue-500" />
                              Appearance
                            </h4>
                            <div className="space-y-3 pl-6">
                              <div className="flex items-center justify-between">
                                <Label htmlFor="dark-mode" className="text-sm">Dark mode</Label>
                                <Switch
                                  id="dark-mode"
                                  checked={darkMode}
                                  onCheckedChange={setDarkMode}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Notifications */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              <Bell className="w-4 h-4 text-orange-500" />
                              Notifications
                            </h4>
                            <div className="space-y-3 pl-6">
                              <div className="flex items-center justify-between">
                                <Label htmlFor="notifications" className="text-sm">Push notifications</Label>
                                <Switch
                                  id="notifications"
                                  checked={notifications}
                                  onCheckedChange={setNotifications}
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <Label htmlFor="sound-effects" className="text-sm">Sound effects</Label>
                                <Switch
                                  id="sound-effects"
                                  checked={soundEffects}
                                  onCheckedChange={setSoundEffects}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Data Management */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              <Database className="w-4 h-4 text-green-500" />
                              Data
                            </h4>
                            <div className="space-y-2 pl-6">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full justify-start text-left h-8"
                                onClick={() => {
                                  const data = {
                                    tasks: currentTasks,
                                    categories: currentCategories,
                                    userProfile,
                                    achievements
                                  }
                                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                                  const url = URL.createObjectURL(blob)
                                  const a = document.createElement('a')
                                  a.href = url
                                  a.download = 'taskflow-backup.json'
                                  a.click()
                                  toast.success('Data exported successfully!')
                                }}
                              >
                                <Download className="w-3 h-3 mr-2" />
                                Export data
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full justify-start text-left h-8 text-red-600 hover:text-red-700"
                                onClick={() => {
                                  if (confirm('Are you sure? This will clear all your data.')) {
                                    setTasks([])
                                    setCategories(defaultCategories)
                                    setUserProfile({
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
                                    setAchievements(defaultAchievements)
                                    setAiInsights([])
                                    toast.success('All data cleared')
                                  }
                                }}
                              >
                                <Trash className="w-3 h-3 mr-2" />
                                Clear all data
                              </Button>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mobile-Friendly Task Lists */}
            <div className="space-y-4">
              {/* Pending Tasks */}
              {pendingTasks.length > 0 && (
                <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Target className="w-4 h-4 text-blue-500" />
                      Active Tasks
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                        {pendingTasks.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    {pendingTasks.map(task => {
                      const category = getCategoryById(task.categoryId)
                      return (
                        <div key={task.id} className="task-item flex items-start gap-2 p-2 md:p-3 bg-white/50 rounded-lg border border-gray-200/50 hover:shadow-lg transition-all duration-200">
                          <Checkbox
                            id={`task-${task.id}`}
                            checked={task.completed}
                            onCheckedChange={() => toggleTask(task.id)}
                            className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500 mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <label 
                              htmlFor={`task-${task.id}`}
                              className="font-medium cursor-pointer text-gray-800 block text-sm leading-relaxed"
                            >
                              {task.title}
                            </label>
                            <div className="flex flex-wrap items-center gap-1 mt-1">
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
                                  className={`text-xs px-1 py-0 h-4 ${
                                    task.priority === 'urgent' ? 'border-red-200 text-red-700 bg-red-50' :
                                    task.priority === 'high' ? 'border-orange-200 text-orange-700 bg-orange-50' :
                                    'border-green-200 text-green-700 bg-green-50'
                                  }`}
                                >
                                  {task.priority}
                                </Badge>
                              )}
                              {task.xpValue && (
                                <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-yellow-50 border-yellow-200 text-yellow-700">
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
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Heart className="w-4 h-4 text-green-500" />
                      Completed
                      <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 text-xs">
                        {completedTasks.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    {completedTasks.slice(0, 5).map(task => {
                      const category = getCategoryById(task.categoryId)
                      return (
                        <div key={task.id} className="flex items-center gap-2 p-2 bg-green-50/50 rounded-lg border border-green-200/50">
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
                      <div className="text-center pt-1">
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
                  <CardContent className="py-12 text-center">
                    <div className="relative mb-6">
                      <div className="text-6xl mb-4 animate-bounce">🚀</div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-pulse">
                        <Sparkle className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Transform Your Productivity
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto leading-relaxed">
                      Welcome to TaskFlow AI! Add your first task and experience the power of AI-driven productivity. 
                      Watch as our intelligent system learns your patterns and optimizes your workflow.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                      <Button 
                        onClick={() => document.getElementById('new-task')?.focus()}
                        className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg px-6 py-2"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Your First Task
                      </Button>
                      <Button 
                        variant="outline"
                        className="border-purple-200 hover:border-purple-300 text-purple-600 hover:text-purple-700"
                      >
                        <Brain className="w-4 h-4 mr-2" />
                        Learn About AI Features
                      </Button>
                    </div>
                    
                    {/* World-Class Feature Teaser */}
                    <div className="mt-8 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                      <h4 className="font-semibold text-sm text-purple-800 mb-3 flex items-center justify-center gap-2">
                        <ShootingStar className="w-4 h-4" />
                        Coming Soon: World-Class Features
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                        <div className="p-2 bg-white/50 rounded-lg">
                          <MagicWand className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                          <p className="text-xs text-purple-700 font-medium">AI Coach</p>
                        </div>
                        <div className="p-2 bg-white/50 rounded-lg">
                          <VideoCamera className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                          <p className="text-xs text-orange-700 font-medium">Stories</p>
                        </div>
                        <div className="p-2 bg-white/50 rounded-lg">
                          <Eye className="w-5 h-5 text-green-600 mx-auto mb-1" />
                          <p className="text-xs text-green-700 font-medium">AR View</p>
                        </div>
                        <div className="p-2 bg-white/50 rounded-lg">
                          <Microphone className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                          <p className="text-xs text-blue-700 font-medium">Voice AI</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Feature highlights */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-left">
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                        <Brain className="w-6 h-6 text-blue-600 mb-2" />
                        <h4 className="font-semibold text-sm text-blue-800 mb-1">AI Insights</h4>
                        <p className="text-xs text-blue-600">Get personalized productivity recommendations</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                        <Trophy className="w-6 h-6 text-purple-600 mb-2" />
                        <h4 className="font-semibold text-sm text-purple-800 mb-1">Achievements</h4>
                        <p className="text-xs text-purple-600">Unlock rewards and track your progress</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                        <ChartLine className="w-6 h-6 text-green-600 mb-2" />
                        <h4 className="font-semibold text-sm text-green-800 mb-1">Analytics</h4>
                        <p className="text-xs text-green-600">Visualize your productivity patterns</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="insights">
            <div className="space-y-4">
              {/* Advanced AI Features Preview */}
              <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-purple-200 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MagicWand className="w-4 h-4 text-purple-500" />
                    🧠 AI Superpowers
                    <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs">NEXT-GEN</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-white/70 rounded-lg border border-blue-200/50">
                      <h4 className="font-semibold text-sm text-blue-800 mb-1 flex items-center gap-2">
                        <Compass className="w-4 h-4" />
                        Predictive AI Coach
                      </h4>
                      <p className="text-xs text-blue-600 mb-2">AI predicts your optimal work times and suggests perfect task sequences</p>
                      <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-blue-50 border-blue-200 text-blue-700">Coming Soon</Badge>
                    </div>
                    
                    <div className="p-3 bg-white/70 rounded-lg border border-purple-200/50">
                      <h4 className="font-semibold text-sm text-purple-800 mb-1 flex items-center gap-2">
                        <Heart className="w-4 h-4" />
                        Mood Intelligence
                      </h4>
                      <p className="text-xs text-purple-600 mb-2">AI detects your energy levels and adapts recommendations automatically</p>
                      <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-purple-50 border-purple-200 text-purple-700">Beta</Badge>
                    </div>
                    
                    <div className="p-3 bg-white/70 rounded-lg border border-green-200/50">
                      <h4 className="font-semibold text-sm text-green-800 mb-1 flex items-center gap-2">
                        <TrendUp className="w-4 h-4" />
                        Future Forecasting
                      </h4>
                      <p className="text-xs text-green-600 mb-2">See your productivity trends and predicted performance weeks ahead</p>
                      <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-green-50 border-green-200 text-green-700">Alpha</Badge>
                    </div>
                    
                    <div className="p-3 bg-white/70 rounded-lg border border-orange-200/50">
                      <h4 className="font-semibold text-sm text-orange-800 mb-1 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Context Awareness
                      </h4>
                      <p className="text-xs text-orange-600 mb-2">Location, weather, and calendar-aware task suggestions</p>
                      <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-orange-50 border-orange-200 text-orange-700">Research</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Current AI Insights */}
              <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-purple-500" />
                      AI Productivity Insights
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => generateProductivityInsight()}
                      disabled={isAnalyzing || currentTasks.length < 2}
                      className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                    >
                      {isAnalyzing ? (
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                          Analyzing
                        </div>
                      ) : (
                        <>
                          <Sparkle className="w-3 h-3 mr-1" />
                          Generate
                        </>
                      )}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {aiInsights.length > 0 ? (
                    <div className="space-y-3">
                      {aiInsights.map((insight, index) => (
                        <div 
                          key={index}
                          className="insight-card p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200/50"
                        >
                          <div className="flex items-start gap-2">
                            <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <Sparkle className="w-3 h-3 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm text-gray-800 mb-1">{insight.title}</h4>
                              <p className="text-xs text-gray-600 leading-relaxed">{insight.description}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 bg-blue-50 border-blue-200 text-blue-700">
                                  {insight.confidence}% confidence
                                </Badge>
                                {insight.actionable && (
                                  <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 bg-green-50 border-green-200 text-green-700">
                                    Actionable
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Brain className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <h3 className="font-semibold mb-2 text-sm">AI-Powered Productivity Insights</h3>
                      <p className="text-gray-600 mb-4 text-sm">
                        {currentTasks.length < 2 
                          ? "Add a few tasks to unlock personalized AI insights about your productivity patterns."
                          : "Generate insights to discover patterns in your workflow and get personalized recommendations."
                        }
                      </p>
                      {currentTasks.length >= 2 && (
                        <Button 
                          size="sm" 
                          onClick={() => generateProductivityInsight()}
                          disabled={isAnalyzing}
                          className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                        >
                          {isAnalyzing ? 'Analyzing...' : 'Generate First Insights'}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="space-y-4">
              {/* Progress Overview */}
              <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ChartLine className="w-4 h-4 text-blue-500" />
                    Progress Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Completion Rate */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Completion Rate</span>
                        <span className="text-sm text-gray-600">
                          {currentTasks.length > 0 ? Math.round((completedTasks.length / currentTasks.length) * 100) : 0}%
                        </span>
                      </div>
                      <Progress 
                        value={currentTasks.length > 0 ? (completedTasks.length / currentTasks.length) * 100 : 0} 
                        className="h-2"
                      />
                    </div>

                    {/* XP Progress */}
                    {userProfile && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Level Progress</span>
                          <span className="text-sm text-gray-600">
                            {userProfile.xp % 100}/100 XP
                          </span>
                        </div>
                        <Progress 
                          value={(userProfile.xp % 100)} 
                          className="h-2 xp-bar"
                        />
                      </div>
                    )}

                    {/* Category Breakdown */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Tasks by Category</h4>
                      <div className="space-y-2">
                        {currentCategories.map(category => {
                          const categoryTasks = currentTasks.filter(t => t.categoryId === category.id)
                          const categoryCompleted = categoryTasks.filter(t => t.completed).length
                          const percentage = categoryTasks.length > 0 ? (categoryCompleted / categoryTasks.length) * 100 : 0
                          
                          if (categoryTasks.length === 0) return null
                          
                          return (
                            <div key={category.id} className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${category.color}`} />
                              <span className="text-xs flex-1">{category.name}</span>
                              <span className="text-xs text-gray-600 min-w-[40px] text-right">
                                {categoryCompleted}/{categoryTasks.length}
                              </span>
                              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                <div 
                                  className={`h-1.5 rounded-full ${category.color}`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Achievement Progress */}
              <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(achievements || []).slice(0, 4).map(achievement => {
                      const isUnlocked = achievement.unlockedAt
                      const progress = achievement.progress || 0
                      const maxProgress = achievement.maxProgress || 1
                      const progressPercent = (progress / maxProgress) * 100
                      
                      return (
                        <div 
                          key={achievement.id}
                          className={`p-3 rounded-lg border transition-all ${
                            isUnlocked 
                              ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 achievement-glow' 
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{achievement.icon}</span>
                            <div className="flex-1 min-w-0">
                              <h4 className={`text-sm font-medium ${isUnlocked ? 'text-yellow-700' : 'text-gray-500'}`}>
                                {achievement.title}
                              </h4>
                              <p className={`text-xs ${isUnlocked ? 'text-yellow-600' : 'text-gray-400'}`}>
                                {achievement.description}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className={isUnlocked ? 'text-yellow-700' : 'text-gray-500'}>
                                Progress: {progress}/{maxProgress}
                              </span>
                              <span className={`font-medium ${isUnlocked ? 'text-yellow-700' : 'text-gray-500'}`}>
                                +{achievement.xpReward} XP
                              </span>
                            </div>
                            <Progress 
                              value={progressPercent} 
                              className={`h-1.5 ${isUnlocked ? 'xp-bar' : ''}`}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="social">
            <div className="space-y-4">
              {/* World-Class Feature Preview Cards */}
              <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Rocket className="w-4 h-4 text-purple-500" />
                    🚀 Coming Soon: Revolutionary Features
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs">PREVIEW</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* AI Superpowers */}
                    <div className="p-3 bg-white/70 rounded-lg border border-blue-200/50 hover:shadow-lg transition-all cursor-pointer">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                          <MagicWand className="w-4 h-4 text-white" />
                        </div>
                        <h4 className="font-semibold text-sm">AI Superpowers</h4>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">Predictive task generation, mood-based recommendations, future productivity forecasting</p>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-blue-50 border-blue-200 text-blue-700">Smart Scheduling</Badge>
                        <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-purple-50 border-purple-200 text-purple-700">Mood AI</Badge>
                      </div>
                    </div>

                    {/* Productivity Stories */}
                    <div className="p-3 bg-white/70 rounded-lg border border-orange-200/50 hover:shadow-lg transition-all cursor-pointer">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                          <VideoCamera className="w-4 h-4 text-white" />
                        </div>
                        <h4 className="font-semibold text-sm">Productivity Stories</h4>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">TikTok-style time-lapse videos of your daily accomplishments, perfect for viral sharing</p>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-orange-50 border-orange-200 text-orange-700">Viral Ready</Badge>
                        <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-red-50 border-red-200 text-red-700">Auto-Gen</Badge>
                      </div>
                    </div>

                    {/* AR Task Visualization */}
                    <div className="p-3 bg-white/70 rounded-lg border border-green-200/50 hover:shadow-lg transition-all cursor-pointer">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                          <Eye className="w-4 h-4 text-white" />
                        </div>
                        <h4 className="font-semibold text-sm">AR Task View</h4>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">See your tasks floating in your real environment with spatial computing</p>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-green-50 border-green-200 text-green-700">Spatial</Badge>
                        <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-emerald-50 border-emerald-200 text-emerald-700">3D</Badge>
                      </div>
                    </div>

                    {/* Virtual Productivity Pets */}
                    <div className="p-3 bg-white/70 rounded-lg border border-yellow-200/50 hover:shadow-lg transition-all cursor-pointer">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                          <Heart className="w-4 h-4 text-white" />
                        </div>
                        <h4 className="font-semibold text-sm">AI Productivity Pet</h4>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">AI companions that evolve based on your productivity patterns and celebrate with you</p>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-yellow-50 border-yellow-200 text-yellow-700">Evolving</Badge>
                        <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-orange-50 border-orange-200 text-orange-700">Interactive</Badge>
                      </div>
                    </div>

                    {/* Voice AI Control */}
                    <div className="p-3 bg-white/70 rounded-lg border border-indigo-200/50 hover:shadow-lg transition-all cursor-pointer">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                          <Microphone className="w-4 h-4 text-white" />
                        </div>
                        <h4 className="font-semibold text-sm">Voice AI</h4>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">Hands-free task management with natural conversation and context understanding</p>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-indigo-50 border-indigo-200 text-indigo-700">Hands-Free</Badge>
                        <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-purple-50 border-purple-200 text-purple-700">Contextual</Badge>
                      </div>
                    </div>

                    {/* Dynamic Theming */}
                    <div className="p-3 bg-white/70 rounded-lg border border-pink-200/50 hover:shadow-lg transition-all cursor-pointer">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center">
                          <Palette className="w-4 h-4 text-white" />
                        </div>
                        <h4 className="font-semibold text-sm">Dynamic Themes</h4>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">AI-powered themes that adapt to your mood, time of day, and productivity state</p>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-pink-50 border-pink-200 text-pink-700">Adaptive</Badge>
                        <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-rose-50 border-rose-200 text-rose-700">Mood-Based</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Viral Features Coming Soon */}
              <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShootingStar className="w-4 h-4 text-orange-500" />
                    🌟 Viral Social Features
                    <Badge className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white text-xs">COMING SOON</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                      <Trophy className="w-5 h-5 text-orange-500" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium">Global Productivity Battles</h4>
                        <p className="text-xs text-gray-600">Real-time 1v1 productivity competitions with friends</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                      <Camera className="w-5 h-5 text-orange-500" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium">Achievement Cinematics</h4>
                        <p className="text-xs text-gray-600">Instagram-worthy visual celebrations of your wins</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                      <Users className="w-5 h-5 text-orange-500" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium">Team Workspaces</h4>
                        <p className="text-xs text-gray-600">Collaborative productivity with shared insights</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-white/50 rounded-lg">
                      <Compass className="w-5 h-5 text-orange-500" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium">Productivity DNA</h4>
                        <p className="text-xs text-gray-600">Genetic-style profile showing your unique traits</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Current Social Features */}
              <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Trophy className="w-4 h-4 text-orange-500" />
                    Global Challenges
                    <Badge className="bg-orange-100 text-orange-700 text-xs">Live</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {challenges.map(challenge => (
                      <div key={challenge.id} className="p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm text-orange-800 mb-1">
                              {challenge.title}
                              {challenge.trending && (
                                <Fire className="w-3 h-3 text-orange-500 inline ml-1" />
                              )}
                            </h4>
                            <p className="text-xs text-orange-600 mb-2">{challenge.description}</p>
                            <div className="flex items-center gap-3 text-xs">
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3 text-orange-500" />
                                <span className="text-orange-700">{challenge.participants.toLocaleString()} participants</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-orange-500" />
                                <span className="text-orange-700">
                                  {Math.ceil((challenge.endsAt - Date.now()) / (24 * 60 * 60 * 1000))} days left
                                </span>
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-yellow-50 border-yellow-200 text-yellow-700 text-xs">
                            +{challenge.xpReward} XP
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-orange-700">Progress: {challenge.current}/{challenge.target}</span>
                            <span className="text-orange-600">{Math.round((challenge.current / challenge.target) * 100)}%</span>
                          </div>
                          <Progress 
                            value={(challenge.current / challenge.target) * 100} 
                            className="h-2"
                          />
                        </div>
                        <Button 
                          size="sm" 
                          className="w-full mt-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                        >
                          Join Challenge
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Share Achievement */}
              <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Share className="w-4 h-4 text-blue-500" />
                    Share Your Success
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Crown className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-semibold text-base mb-2">Level {userProfile?.level || 1} Achiever</h3>
                    <p className="text-gray-600 text-sm mb-4">
                      {completedTasks.length} tasks completed • {userProfile?.xp || 0} XP earned
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 hover:border-blue-300"
                      >
                        <Share className="w-3 h-3 mr-1" />
                        Share Progress
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200 hover:border-green-300"
                      >
                        <Trophy className="w-3 h-3 mr-1" />
                        View Leaderboard
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App