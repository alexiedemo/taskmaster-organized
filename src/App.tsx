import { useState, useEffect, useRef } from 'react'
import { useKV } from '@github/spark/hooks'
import { 
  Plus, Gear, Funnel, Brain, Sparkle, TrendUp, Clock, ChatCircle, Robot, 
  Trophy, Fire, Target, Share, Users, Crown, Lightning, Star,
  Rocket, Heart, ChartBar, Camera, GlobeHemisphereWest, Medal,
  Confetti, GameController, Calendar, MapPin, Microphone, Eye, Atom
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
      
      // Show success notification
      toast.success(`🧠 AI analysis complete! Found ${data.insights?.length || 0} insights`, {
        action: {
          label: 'View insights',
          onClick: () => {
            const insightsTab = document.querySelector('[value="insights"]') as HTMLElement
            insightsTab?.click()
          }
        }
      })
      
    } catch (error) {
      console.error('AI analysis failed:', error)
      toast.error('AI analysis failed. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Calculate XP for a task based on difficulty, priority, and category
  const calculateXP = (task: Task, category: Category): number => {
    let baseXP = 10
    
    // Priority multiplier
    const priorityMultiplier = {
      'low': 0.8,
      'medium': 1.0,
      'high': 1.5,
      'urgent': 2.0
    }
    
    // Difficulty multiplier
    const difficultyMultiplier = task.difficulty || 1
    
    // Category multiplier
    const categoryMultiplier = category.xpMultiplier || 1.0
    
    return Math.round(baseXP * (priorityMultiplier[task.priority || 'medium']) * difficultyMultiplier * categoryMultiplier);
  }

  // Add XP and handle level ups
  const addXP = (amount: number) => {
    setUserProfile(prev => {
      const current = prev || {
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
      }
      
      const newXP = current.xp + amount
      let newLevel = current.level
      let xpToNext = current.xpToNext
      
      // Level up calculation
      while (newXP >= xpToNext) {
        newLevel++
        xpToNext = newLevel * 100 // Each level requires level * 100 XP
      }
      
      // Show level up celebration
      if (newLevel > current.level) {
        triggerCelebration(`🎉 Level ${newLevel} Reached! 🎉`, 'legendary')
        toast.success(`Congratulations! You've reached Level ${newLevel}!`, {
          duration: 5000,
          action: {
            label: 'Share Achievement',
            onClick: () => shareAchievement(`Just reached Level ${newLevel} on TaskFlow AI! 🎉`)
          }
        })
      }
      
      return {
        ...current,
        xp: newXP,
        level: newLevel,
        xpToNext: xpToNext
      }
    })
  }

  const checkAchievements = (task?: Task) => {
    if (!userProfile || !achievements) return
    
    const unlockedAchievements: Achievement[] = []
    
    achievements.forEach(achievement => {
      if (achievement.unlockedAt) return // Already unlocked
      
      let shouldUnlock = false
      let currentProgress = achievement.progress || 0
      
      switch (achievement.id) {
        case 'first-task':
          if (task && task.completed) {
            shouldUnlock = true
          }
          break
        case 'streak-3':
          currentProgress = userProfile.streak
          shouldUnlock = userProfile.streak >= 3
          break
        case 'streak-7':
          currentProgress = userProfile.streak
          shouldUnlock = userProfile.streak >= 7
          break
        case 'speedster':
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const todayCompleted = tasks?.filter(t => 
            t.completed && t.completedAt && new Date(t.completedAt) >= today
          ).length || 0
          currentProgress = todayCompleted
          shouldUnlock = todayCompleted >= 10
          break
      }
      
      if (shouldUnlock && !achievement.unlockedAt) {
        const unlockedAchievement = {
          ...achievement,
          unlockedAt: Date.now(),
          progress: achievement.maxProgress
        }
        unlockedAchievements.push(unlockedAchievement)
        addXP(achievement.xpReward)
        triggerCelebration(`🏆 ${achievement.title} Unlocked! 🏆`, achievement.rarity)
      } else if (currentProgress !== achievement.progress) {
        // Update progress
        setAchievements(prev => (prev || []).map(a => a.id === achievement.id ? { ...a, progress: currentProgress } : a))
      }
    })
    
    if (unlockedAchievements.length > 0) {
      setAchievements(prev => (prev || []).map(a => {
        const unlocked = unlockedAchievements.find(ua => ua.id === a.id)
        return unlocked || a
      }))
    }
  }

  const triggerCelebration = (message: string, type: 'common' | 'rare' | 'epic' | 'legendary') => {
    setShowCelebration(true)
    toast.success(message, {
      duration: type === 'legendary' ? 8000 : 5000,
      action: {
        label: 'Share',
        onClick: () => shareAchievement(message)
      }
    })
    
    // Auto-hide celebration
    setTimeout(() => setShowCelebration(false), 4000)
  }

  const shareAchievement = (text: string) => {
    if (navigator.share) {
      navigator.share({
        title: 'TaskFlow AI Achievement',
        text: text,
        url: window.location.href
      })
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(`${text} Check out TaskFlow AI: ${window.location.href}`)
      toast.success('Achievement copied to clipboard!')
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

  const calculateProductivityStats = (): ProductivityStats | null => {
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

    // Calculate today's tasks
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTasks = tasks.filter(t => new Date(t.createdAt) >= today).length

    // Calculate weekly tasks
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const weeklyTasks = tasks.filter(t => new Date(t.createdAt) >= weekStart).length

    // Calculate monthly tasks  
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const monthlyTasks = tasks.filter(t => new Date(t.createdAt) >= monthStart).length

    return {
      totalTasks: tasks.length,
      completedTasks: completed.length,
      averageCompletionTime: completionTimes.length > 0 
        ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length 
        : 0,
      mostProductiveCategory: mostProductive.category,
      completionRate: tasks.length > 0 ? (completed.length / tasks.length) * 100 : 0,
      peakHours,
      streakDays: userProfile?.streak || 0,
      totalXP: userProfile?.xp || 0,
      level: userProfile?.level || 1,
      todayTasks,
      weeklyTasks,
      monthlyTasks
    }
  }

  // Update productivity stats when tasks change
  useEffect(() => {
    const stats = calculateProductivityStats()
    setProductivityStats(stats)
  }, [tasks, categories])

  // Initialize with sample tasks if none exist to demonstrate AI features
  useEffect(() => {
    if (!tasks || tasks.length === 0) {
      const sampleTasks: Task[] = [
        {
          id: '1',
          title: 'Review quarterly budget reports',
          completed: true,
          categoryId: 'work',
          createdAt: Date.now() - 86400000 * 3, // 3 days ago
          completedAt: Date.now() - 86400000 * 2, // 2 days ago
          priority: 'high'
        },
        {
          id: '2',
          title: 'Schedule team meeting for project kickoff',
          completed: true,
          categoryId: 'work',
          createdAt: Date.now() - 86400000 * 2,
          completedAt: Date.now() - 86400000 * 1,
          priority: 'medium'
        },
        {
          id: '3',
          title: 'Buy groceries for the week',
          completed: false,
          categoryId: 'personal',
          createdAt: Date.now() - 86400000 * 1,
          priority: 'medium'
        },
        {
          id: '4',
          title: 'Book dentist appointment',
          completed: false,
          categoryId: 'health',
          createdAt: Date.now() - 3600000 * 12, // 12 hours ago
          priority: 'high'
        },
        {
          id: '5',
          title: 'Update project documentation',
          completed: false,
          categoryId: 'work',
          createdAt: Date.now() - 3600000 * 6, // 6 hours ago
          priority: 'low'
        }
      ]
      setTasks(sampleTasks)
    }
  }, [])

  // Generate initial AI insights
  useEffect(() => {
    if (tasks && tasks.length >= 3 && aiInsights.length === 0) {
      // Add a small delay to ensure tasks are properly set
      const timer = setTimeout(() => {
        generateAIInsights()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [tasks])

  const addTask = async () => {
    if (!newTaskTitle.trim()) return
    
    // Get AI category suggestion
    const suggestedCategoryId = await suggestTaskCategory(newTaskTitle)
    const category = categories?.find(c => c.id === suggestedCategoryId) || categories?.[0]
    
    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      completed: false,
      categoryId: suggestedCategoryId,
      createdAt: Date.now(),
      priority: 'medium',
      difficulty: 2,
      energyRequired: 'medium',
      mood: moodState,
      xpValue: category ? calculateXP({ 
        id: '', 
        title: newTaskTitle.trim(), 
        completed: false, 
        categoryId: suggestedCategoryId, 
        createdAt: Date.now(), 
        priority: 'medium', 
        difficulty: 2 
      } as Task, category) : 10
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
          
          // Handle completion rewards
          if (!task.completed) {
            const category = categories?.find(c => c.id === task.categoryId)
            if (category) {
              const xpGained = calculateXP(updated, category)
              addXP(xpGained)
              
              toast.success(`Task completed! +${xpGained} XP 🎉`, {
                action: {
                  label: 'View insights',
                  onClick: () => generateAIInsights()
                }
              })
              
              // Update user stats
              setUserProfile(prev => {
                const current = prev || {
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
                }
                return {
                  ...current,
                  totalTasks: current.totalTasks + 1
                }
              })
              
              // Check for achievements
              checkAchievements(updated)
              setLastCompletedTask(updated)
            }
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
      
      <div className="max-w-7xl mx-auto p-4 relative z-10">
        {/* Revolutionary Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-lg ${aiInsights.length > 0 ? 'animate-pulse' : ''}`}>
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  {aiInsights.length > 0 && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <Sparkle className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    TaskFlow AI
                  </h1>
                  <p className="text-muted-foreground">Transform your productivity with AI superpowers</p>
                </div>
              </div>
              
              {/* User Level & XP */}
              {userProfile && (
                <div className="flex items-center gap-4 bg-white/60 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/20">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                      <Crown className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-600">Level {userProfile.level}</div>
                      <div className="text-xs text-gray-500">{userProfile.xp} XP</div>
                    </div>
                  </div>
                  <div className="w-px h-8 bg-gray-300" />
                  <div className="flex items-center gap-2">
                    <Fire className="w-5 h-5 text-orange-500" />
                    <div>
                      <div className="text-sm font-medium text-gray-600">{userProfile.streak} days</div>
                      <div className="text-xs text-gray-500">streak</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <Dialog open={showProfile} onOpenChange={setShowProfile}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-white/60 backdrop-blur-sm border-white/20">
                    <Trophy className="w-4 h-4 mr-2" />
                    Profile
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Crown className="w-5 h-5 text-yellow-500" />
                      Your Productivity Profile
                    </DialogTitle>
                  </DialogHeader>
                  {userProfile && (
                    <div className="space-y-6">
                      {/* Level Progress */}
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">Level {userProfile.level}</div>
                        <div className="text-gray-600">{userProfile.xp} / {userProfile.xpToNext} XP</div>
                        <Progress value={(userProfile.xp / userProfile.xpToNext) * 100} className="mt-2" />
                      </div>
                      
                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <Fire className="w-6 h-6 text-orange-500 mx-auto mb-1" />
                          <div className="font-semibold">{userProfile.streak}</div>
                          <div className="text-xs text-gray-600">Current Streak</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <Target className="w-6 h-6 text-purple-500 mx-auto mb-1" />
                          <div className="font-semibold">{userProfile.totalTasks}</div>
                          <div className="text-xs text-gray-600">Tasks Completed</div>
                        </div>
                      </div>
                      
                      {/* Achievements Preview */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <Label className="font-medium">Recent Achievements</Label>
                          <Button 
                            variant="link" 
                            size="sm" 
                            onClick={() => setShowAchievements(true)}
                            className="h-auto p-0"
                          >
                            View All
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {achievements?.filter(a => a.unlockedAt).slice(0, 3).map(achievement => (
                            <div key={achievement.id} className="text-center p-2 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                              <div className="text-lg mb-1">{achievement.icon}</div>
                              <div className="text-xs font-medium text-gray-700">{achievement.title}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
              
              <Dialog open={showChallenges} onOpenChange={setShowChallenges}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-white/60 backdrop-blur-sm border-white/20">
                    <GlobeHemisphereWest className="w-4 h-4 mr-2" />
                    Challenges
                    <Badge variant="secondary" className="ml-2 bg-red-500 text-white">
                      {challenges.length}
                    </Badge>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <GlobeHemisphereWest className="w-5 h-5 text-blue-500" />
                      Global Challenges
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {challenges.map(challenge => (
                      <Card key={challenge.id} className={`border-2 ${challenge.trending ? 'border-orange-200 bg-orange-50' : 'border-gray-200'}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-semibold text-gray-800">{challenge.title}</div>
                              <div className="text-sm text-gray-600">{challenge.description}</div>
                            </div>
                            {challenge.trending && (
                              <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                                🔥 Trending
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Progress</span>
                              <span>{challenge.current} / {challenge.target}</span>
                            </div>
                            <Progress value={(challenge.current / challenge.target) * 100} className="h-2" />
                            <div className="flex justify-between items-center text-xs text-gray-500">
                              <span>{challenge.participants.toLocaleString()} participants</span>
                              <span>+{challenge.xpReward} XP reward</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button 
                onClick={generateAIInsights} 
                disabled={isAnalyzing || !tasks || tasks.length < 3}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all duration-300"
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
                    {aiInsights.length > 0 && (
                      <Badge variant="secondary" className="ml-2 bg-white/20 text-white border-white/20">
                        {aiInsights.length}
                      </Badge>
                    )}
                  </>
                )}
              </Button>
              
              <Dialog open={showAIChat} onOpenChange={setShowAIChat}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="bg-white/60 backdrop-blur-sm border-white/20">
                    <Robot className="w-4 h-4 mr-2" />
                    AI Chat
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Robot className="w-5 h-5 text-purple-500" />
                      AI Productivity Assistant
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {chatHistory.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-4">
                          Ask me anything about your tasks or productivity! I can help you optimize your workflow.
                        </div>
                      ) : (
                        chatHistory.map((msg, idx) => (
                          <div key={idx} className={`p-3 rounded-lg text-sm ${
                            msg.role === 'user' 
                              ? 'bg-blue-500 text-white ml-6' 
                              : 'bg-gray-100 mr-6'
                          }`}>
                            {msg.message}
                          </div>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ask me anything..."
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAIChat()}
                        className="flex-1"
                      />
                      <Button onClick={handleAIChat} size="sm" disabled={!chatMessage.trim()}>
                        Send
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{currentTasks.length}</div>
                <div className="text-xs text-gray-600">Total Tasks</div>
              </CardContent>
            </Card>
            <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{pendingTasks.length}</div>
                <div className="text-xs text-gray-600">Pending</div>
              </CardContent>
            </Card>
            <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{completedTasks.length}</div>
                <div className="text-xs text-gray-600">Completed</div>
              </CardContent>
            </Card>
            <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {productivityStats ? Math.round(productivityStats.completionRate) : 0}%
                </div>
                <div className="text-xs text-gray-600">Success Rate</div>
              </CardContent>
            </Card>
            <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {userProfile?.level || 1}
                </div>
                <div className="text-xs text-gray-600">Level</div>
              </CardContent>
            </Card>
            <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-pink-600">
                  {userProfile?.streak || 0}
                </div>
                <div className="text-xs text-gray-600">Streak</div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
            <TabsTrigger value="tasks" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Target className="w-4 h-4 mr-2" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="insights" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <Brain className="w-4 h-4 mr-2" />
              AI Insights
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
              <ChartBar className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="social" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" />
              Social
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-6">
            {/* Enhanced AI Insights Preview */}
            {aiInsights.length > 0 && (
              <Card className="mb-6 border-2 border-purple-200 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-700">
                    <Brain className="w-6 h-6" />
                    AI Productivity Insights
                    <Badge variant="secondary" className="ml-auto bg-purple-100 text-purple-700 animate-pulse">
                      {aiInsights.length} active insights
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {aiInsights.slice(0, 2).map((insight, idx) => (
                      <div key={idx} className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-purple-100 shadow-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-semibold text-purple-800 flex items-center gap-2">
                            <Sparkle className="w-4 h-4" />
                            {insight.title}
                          </div>
                          <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                            {Math.round(insight.confidence * 100)}% confidence
                          </Badge>
                        </div>
                        <div className="text-purple-600 text-sm mb-3">{insight.description}</div>
                        {insight.actionable && (
                          <Badge variant="outline" className="text-green-600 text-xs bg-green-50 border-green-200">
                            ✨ Actionable
                          </Badge>
                        )}
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2">
                      {aiInsights.length > 2 && (
                        <Button 
                          variant="link" 
                          className="justify-start p-0 h-auto text-purple-600 font-medium" 
                          onClick={() => {
                            const insightsTab = document.querySelector('[value="insights"]') as HTMLElement
                            insightsTab?.click()
                          }}
                        >
                          View all {aiInsights.length} insights →
                        </Button>
                      )}
                      <Button 
                        onClick={generateAIInsights} 
                        variant="outline"
                        size="sm"
                        disabled={isAnalyzing}
                        className="ml-auto border-purple-200 text-purple-600 hover:bg-purple-50"
                      >
                        {isAnalyzing ? (
                          <>
                            <div className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mr-1" />
                            Refreshing...
                          </>
                        ) : (
                          <>
                            <Sparkle className="w-3 h-3 mr-1" />
                            Refresh AI
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Enhanced Task Input */}
            <Card className="mb-6 bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 flex gap-2">
                    <Input
                      id="new-task"
                      placeholder="Add a new task... (AI will optimize everything for you ✨)"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addTask()}
                      className="flex-1 border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                    />
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-40 border-purple-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currentCategories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${category.color}`} />
                              <span>{category.icon}</span>
                              {category.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={addTask}
                      className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="w-40 border-purple-200">
                        <SelectValue placeholder="Filter tasks" />
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
                              <span>{category.icon}</span>
                              {category.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="border-purple-200">
                          <Gear className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Manage Categories</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
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

                          <div className="space-y-2">
                            <Label>Existing Categories</Label>
                            <div className="space-y-2">
                              {currentCategories.map(category => (
                                <div key={category.id} className="flex items-center justify-between p-2 border rounded">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-4 h-4 rounded-full ${category.color}`} />
                                    <span>{category.icon}</span>
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

            {/* Enhanced Task Lists */}
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
                        <div key={task.id} className="task-item flex items-center gap-4 p-4 bg-white/50 rounded-xl border border-gray-200/50 hover:shadow-lg transition-all duration-200">
                          <Checkbox
                            id={`task-${task.id}`}
                            checked={task.completed}
                            onCheckedChange={() => toggleTask(task.id)}
                            className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                          />
                          <div className="flex-1">
                            <label 
                              htmlFor={`task-${task.id}`}
                              className="font-medium cursor-pointer text-gray-800 block"
                            >
                              {task.title}
                            </label>
                            <div className="flex items-center gap-2 mt-1">
                              {category && (
                                <div className="flex items-center gap-1">
                                  <div className={`w-2 h-2 rounded-full ${category.color}`} />
                                  <span className="text-xs text-gray-500">{category.icon} {category.name}</span>
                                </div>
                              )}
                              {task.priority && task.priority !== 'medium' && (
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${
                                    task.priority === 'urgent' ? 'border-red-200 text-red-700 bg-red-50' :
                                    task.priority === 'high' ? 'border-orange-200 text-orange-700 bg-orange-50' :
                                    'border-green-200 text-green-700 bg-green-50'
                                  }`}
                                >
                                  {task.priority}
                                </Badge>
                              )}
                              {task.xpValue && (
                                <Badge variant="outline" className="text-xs bg-yellow-50 border-yellow-200 text-yellow-700">
                                  +{task.xpValue} XP
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deleteTask(task.id)}
                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
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
                        <div key={task.id} className="flex items-center gap-4 p-3 bg-green-50/50 rounded-lg border border-green-200/50">
                          <Checkbox
                            id={`completed-task-${task.id}`}
                            checked={task.completed}
                            onCheckedChange={() => toggleTask(task.id)}
                            className="data-[state=checked]:bg-green-500"
                          />
                          <div className="flex-1">
                            <label 
                              htmlFor={`completed-task-${task.id}`}
                              className="text-sm line-through text-green-600 cursor-pointer opacity-75"
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
                      Add your first task and watch our AI work its magic to optimize your workflow, suggest improvements, and help you achieve more.
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

          {/* Other tabs content would continue here */}
          <TabsContent value="insights">
            <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-500" />
                  AI Productivity Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                {aiInsights.length === 0 ? (
                  <div className="text-center py-12">
                    <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">AI Insights Coming Soon</h3>
                    <p className="text-gray-600 mb-6">
                      Add more tasks to unlock powerful AI insights about your productivity patterns.
                    </p>
                    <Button 
                      onClick={generateAIInsights} 
                      disabled={!tasks || tasks.length < 3}
                      className="bg-gradient-to-r from-blue-500 to-purple-500"
                    >
                      Generate First Insights
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {aiInsights.map((insight, idx) => (
                      <Card key={idx} className="border-l-4 border-l-purple-500 bg-purple-50/50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-purple-800">{insight.title}</h4>
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                              {Math.round(insight.confidence * 100)}% confidence
                            </Badge>
                          </div>
                          <p className="text-gray-600 mb-3">{insight.description}</p>
                          {insight.actionable && (
                            <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">
                              ✨ Actionable
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid gap-6">
              {productivityStats ? (
                <>
                  <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendUp className="w-5 h-5 text-green-500" />
                        Productivity Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-600">{productivityStats.completedTasks}</div>
                          <div className="text-sm text-gray-600">Completed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-600">{Math.round(productivityStats.completionRate)}%</div>
                          <div className="text-sm text-gray-600">Success Rate</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-purple-600">{productivityStats.level}</div>
                          <div className="text-sm text-gray-600">Level</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-orange-600">{productivityStats.streakDays}</div>
                          <div className="text-sm text-gray-600">Streak</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
                  <CardContent className="py-12 text-center">
                    <ChartBar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Analytics Coming Soon</h3>
                    <p className="text-gray-600">
                      Complete more tasks to unlock detailed analytics and insights.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
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
                <Button variant="outline" className="mr-2">
                  <Share className="w-4 h-4 mr-2" />
                  Share Achievement
                </Button>
                <Button variant="outline">
                  <Trophy className="w-4 h-4 mr-2" />
                  View Leaderboard
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default App