import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  getDay, 
  isSameDay, 
  isSameMonth, 
  isToday,
  addDays,
  subDays
} from "date-fns"

export interface CustomCalendarProps {
  mode?: "single"
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  month?: Date
  onMonthChange?: (month: Date) => void
  className?: string
  modifiers?: {
    [key: string]: (date: Date) => boolean
  }
  modifiersStyles?: {
    [key: string]: React.CSSProperties
  }
  initialFocus?: boolean
  showOutsideDays?: boolean
}

function CustomCalendar({
  mode = "single",
  selected,
  onSelect,
  month = new Date(),
  onMonthChange,
  className,
  modifiers = {},
  modifiersStyles = {},
  initialFocus,
  showOutsideDays = true,
  ...props
}: CustomCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(month)

  React.useEffect(() => {
    if (month) {
      setCurrentMonth(month)
    }
  }, [month])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const startDate = subDays(monthStart, getDay(monthStart))
  const endDate = addDays(monthEnd, 6 - getDay(monthEnd))

  const days = eachDayOfInterval({ start: startDate, end: endDate })
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  const handlePrevMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    setCurrentMonth(newMonth)
    onMonthChange?.(newMonth)
  }

  const handleNextMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    setCurrentMonth(newMonth)
    onMonthChange?.(newMonth)
  }

  const handleDateClick = (date: Date) => {
    onSelect?.(date)
  }

  const getDateClasses = (date: Date) => {
    const baseClasses = "h-9 w-9 flex items-center justify-center text-sm font-medium cursor-pointer rounded-md transition-colors"
    let classes = [baseClasses]

    if (!isSameMonth(date, currentMonth)) {
      classes.push("text-gray-500 opacity-30")
    } else {
      classes.push("text-white hover:bg-gray-700")
    }

    if (selected && isSameDay(date, selected)) {
      classes.push("bg-blue-500 text-white hover:bg-blue-600")
    }

    if (isToday(date)) {
      classes.push("bg-gray-800")
    }

    // Apply custom modifiers
    Object.entries(modifiers).forEach(([key, modifier]) => {
      if (modifier(date)) {
        const style = modifiersStyles[key]
        if (style?.backgroundColor && style?.color) {
          classes.push("font-bold")
          // We'll apply inline styles for custom colors
        }
      }
    })

    return classes.join(" ")
  }

  const getDateStyle = (date: Date) => {
    let style: React.CSSProperties = {}

    Object.entries(modifiers).forEach(([key, modifier]) => {
      if (modifier(date)) {
        const modifierStyle = modifiersStyles[key]
        if (modifierStyle) {
          style = { ...style, ...modifierStyle }
        }
      }
    })

    return style
  }

  const weeks = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  return (
    <div className={cn("p-3 bg-black text-white", className)} {...props}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-600 bg-gray-800 hover:bg-gray-700 hover:text-white text-white h-7 w-7 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        
        <h2 className="text-sm font-medium text-white">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        
        <button
          onClick={handleNextMonth}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-600 bg-gray-800 hover:bg-gray-700 hover:text-white text-white h-7 w-7 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0">
        {/* Day headers */}
        {dayNames.map((day) => (
          <div
            key={day}
            className="h-9 w-9 flex items-center justify-center text-gray-300 font-normal text-xs"
          >
            {day}
          </div>
        ))}
        
        {/* Date cells */}
        {weeks.map((week, weekIndex) =>
          week.map((date, dayIndex) => (
            <div
              key={`${weekIndex}-${dayIndex}`}
              className={getDateClasses(date)}
              style={getDateStyle(date)}
              onClick={() => handleDateClick(date)}
            >
              {format(date, 'd')}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

CustomCalendar.displayName = "CustomCalendar"

export { CustomCalendar }