import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Plus, Gear, Funnel } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface Task {
  id: string
  title: string
  completed: boolean
  categoryId: string
  createdAt: number
}

interface Category {
  id: string
  name: string
  color: string
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
      createdAt: Date.now()
    }
    
    setTasks(current => [...(current || []), newTask])
    setNewTaskTitle('')
    toast.success('Task added successfully!')
  }

  const toggleTask = (taskId: string) => {
    setTasks(current => 
      (current || []).map(task => 
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">TaskFlow</h1>
          <p className="text-muted-foreground">Organize your day with categorized tasks</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
        </div>

        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Add Task Form */}
              <div className="flex-1 flex gap-2">
                <Input
                  id="new-task"
                  placeholder="Add a new task..."
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
      </div>
    </div>
  )
}

export default App