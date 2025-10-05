# Planning Guide

A powerful yet intuitive task management application that helps users organize their daily activities through categorized todo lists with seamless task completion tracking.

**Experience Qualities**: 
1. **Effortless** - Adding and managing tasks should feel natural and require minimal cognitive overhead
2. **Organized** - Clear visual hierarchy helps users focus on what matters most without feeling overwhelmed  
3. **Satisfying** - Completing tasks provides immediate visual feedback that creates a sense of accomplishment

**Complexity Level**: Light Application (multiple features with basic state)
- The app manages multiple interconnected features (tasks, categories, completion states) with persistent data storage, but maintains simplicity through focused functionality and clear user flows.

## Essential Features

**Add New Tasks**
- Functionality: Create tasks with titles and assign them to categories
- Purpose: Capture user's thoughts and commitments quickly without friction
- Trigger: Click "Add Task" button or press Enter in input field
- Progression: Click add button → input field appears → type task → select category → press Enter/click save → task appears in list
- Success criteria: Task appears immediately in the correct category with proper styling

**Mark Tasks Complete**
- Functionality: Toggle task completion status with visual confirmation
- Purpose: Track progress and provide satisfaction of accomplishment
- Trigger: Click checkbox next to task
- Progression: Click checkbox → task animates to completed state → moves to completed section → completion count updates
- Success criteria: Visual state changes immediately, completed tasks are visually distinct, counts update accurately

**Organize by Categories**
- Functionality: Create custom categories and filter tasks by category
- Purpose: Group related tasks to reduce cognitive load and improve focus
- Trigger: Select category from dropdown or create new category
- Progression: Click category dropdown → select existing or type new → tasks filter to show only selected category → category badge appears
- Success criteria: Tasks filter correctly, category creation works seamlessly, visual grouping is clear

**Category Management**
- Functionality: Create, edit, and delete task categories with color coding
- Purpose: Customize organization system to match user's workflow
- Trigger: Click "Manage Categories" or inline category controls
- Progression: Open category manager → add/edit categories → assign colors → save changes → categories update throughout app
- Success criteria: Changes persist across sessions, color coding is consistent, deletion handles existing tasks gracefully

## Edge Case Handling

- **Empty States**: Friendly illustrations and helpful prompts guide new users toward creating their first task and category
- **Long Task Names**: Text truncation with tooltips ensures layout integrity while preserving full content access  
- **Category Deletion**: Graceful handling when deleting categories that contain tasks - either reassign or move to default category
- **Rapid Interactions**: Debounced inputs and optimistic UI updates prevent duplicate actions during quick successive clicks
- **Storage Limits**: Graceful degradation if local storage approaches capacity limits with user notification

## Design Direction

The design should feel clean, modern, and productivity-focused with subtle playful elements that make task completion satisfying without being distracting - favoring a minimal interface that lets content breathe while providing clear affordances for all interactions.

## Color Selection

Complementary (opposite colors) - Using a warm primary color paired with cool accent tones to create visual interest while maintaining professional appeal suitable for productivity applications.

- **Primary Color**: Warm Blue (oklch(0.6 0.15 230)) - Communicates trust, reliability, and calm focus
- **Secondary Colors**: Soft Gray (oklch(0.95 0.01 230)) for backgrounds and Light Blue (oklch(0.85 0.08 230)) for subtle highlights  
- **Accent Color**: Energetic Orange (oklch(0.7 0.15 50)) - Draws attention to action items and completion states
- **Foreground/Background Pairings**: 
  - Background White (oklch(1 0 0)): Dark Gray text (oklch(0.2 0.01 230)) - Ratio 16.1:1 ✓
  - Primary Blue (oklch(0.6 0.15 230)): White text (oklch(1 0 0)) - Ratio 7.2:1 ✓  
  - Accent Orange (oklch(0.7 0.15 50)): White text (oklch(1 0 0)) - Ratio 5.8:1 ✓
  - Card Gray (oklch(0.98 0.005 230)): Dark Gray text (oklch(0.2 0.01 230)) - Ratio 15.3:1 ✓

## Font Selection

Typography should convey clarity and efficiency while remaining approachable - using Inter for its excellent readability at all sizes and modern geometric feel that supports both productivity and friendliness.

- **Typographic Hierarchy**: 
  - H1 (App Title): Inter Bold/32px/tight letter spacing
  - H2 (Section Headers): Inter Semibold/24px/normal letter spacing  
  - H3 (Category Names): Inter Medium/18px/normal letter spacing
  - Body (Task Text): Inter Regular/16px/relaxed line height
  - Small (Counts/Meta): Inter Medium/14px/normal letter spacing

## Animations

Subtle, purposeful animations that enhance the feeling of responsiveness and provide clear feedback for state changes, balancing functional communication with moments of delight when tasks are completed.

- **Purposeful Meaning**: Smooth check animations reinforce the satisfaction of completion while gentle hover states communicate interactivity
- **Hierarchy of Movement**: Task completion gets the most prominent animation, followed by hover states, then subtle transitions for filtering and navigation

## Component Selection

- **Components**: Cards for task containers, Checkbox for completion states, Input + Button for task creation, Select for category filtering, Badge for category labels, Dialog for category management
- **Customizations**: Custom task card component with integrated checkbox, completion animations, and category badge - enhanced Button variants for different action types
- **States**: Checkboxes animate between unchecked/checked, buttons show hover/active/disabled clearly, inputs have focus rings, cards have subtle hover elevation
- **Icon Selection**: Plus for adding tasks, Check for completion, Settings for category management, Filter for category selection, Trash for deletion
- **Spacing**: Consistent 4-unit (16px) gaps between major sections, 2-unit (8px) for related elements, 1-unit (4px) for tight groupings using Tailwind scale
- **Mobile**: Single column layout on mobile with larger touch targets, category selector becomes bottom sheet, task cards expand to full width with comfortable padding