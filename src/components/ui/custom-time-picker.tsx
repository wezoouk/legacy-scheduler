import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronUp, ChevronDown, Clock } from "lucide-react"

export interface CustomTimePickerProps {
  value?: string
  onChange?: (value: string) => void
  disabled?: boolean
  className?: string
  placeholder?: string
  // When true, renders a 24-hour clock (00-23). Defaults to true.
  use24Hour?: boolean
}

function CustomTimePicker({
  value = "",
  onChange,
  disabled = false,
  className,
  placeholder = "Select time",
  use24Hour = true,
  ...props
}: CustomTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  // 12-hour mode state
  const [hours, setHours] = React.useState(12)
  const [minutes, setMinutes] = React.useState(0)
  const [period, setPeriod] = React.useState<"AM" | "PM">("PM")
  // 24-hour mode state
  const [hours24, setHours24] = React.useState(0)

  // Parse the value when it changes
  React.useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number)
      setMinutes(m)
      if (use24Hour) {
        setHours24((Number.isFinite(h) ? h : 0) as number)
      } else {
        const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
        setHours(hour12)
        setPeriod(h >= 12 ? "PM" : "AM")
      }
    }
  }, [value, use24Hour])

  const formatTime = (h: number, m: number, p: string) => {
    const hour24 = p === "AM" ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12)
    return `${hour24.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }

  const handleTimeChange = (newHours: number, newMinutes: number, newPeriod: string) => {
    const timeString = formatTime(newHours, newMinutes, newPeriod)
    onChange?.(timeString)
  }

  const adjustHours = (delta: number) => {
    if (use24Hour) {
      const newH = (hours24 + delta + 24) % 24
      setHours24(newH)
      onChange?.(`${newH.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`)
    } else {
      const newHours = ((hours - 1 + delta) % 12) + 1
      setHours(newHours)
      handleTimeChange(newHours, minutes, period)
    }
  }

  const adjustMinutes = (delta: number) => {
    const newMinutes = (minutes + delta + 60) % 60
    setMinutes(newMinutes)
    if (use24Hour) {
      const h = hours24
      onChange?.(`${h.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`)
    } else {
      handleTimeChange(hours, newMinutes, period)
    }
  }

  const togglePeriod = () => {
    if (use24Hour) return
    const newPeriod = period === "AM" ? "PM" : "AM"
    setPeriod(newPeriod)
    handleTimeChange(hours, minutes, newPeriod)
  }

  const displayValue = value
    ? (use24Hour
        ? `${hours24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
        : `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`)
    : placeholder

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className={value ? "text-white" : "text-gray-400"}>
            {displayValue}
          </span>
        </div>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>

      {isOpen && !disabled && (
        <div className="absolute bottom-full left-0 z-50 mb-1 w-full rounded-md border border-gray-600 bg-gray-800 p-4 shadow-lg">
          <div className="flex items-center justify-center space-x-4">
            {/* Hours */}
            <div className="flex flex-col items-center space-y-2">
              <button
                type="button"
                onClick={() => adjustHours(1)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-600 bg-gray-700 text-white hover:bg-gray-600 transition-colors"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <div className="flex h-10 w-12 items-center justify-center rounded-md border border-gray-600 bg-gray-900 text-white font-mono text-lg">
                {(use24Hour ? hours24 : hours).toString().padStart(2, '0')}
              </div>
              <button
                type="button"
                onClick={() => adjustHours(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-600 bg-gray-700 text-white hover:bg-gray-600 transition-colors"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            {/* Separator */}
            <div className="text-white text-lg font-mono">:</div>

            {/* Minutes */}
            <div className="flex flex-col items-center space-y-2">
              <button
                type="button"
                onClick={() => adjustMinutes(1)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-600 bg-gray-700 text-white hover:bg-gray-600 transition-colors"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <div className="flex h-10 w-12 items-center justify-center rounded-md border border-gray-600 bg-gray-900 text-white font-mono text-lg">
                {minutes.toString().padStart(2, '0')}
              </div>
              <button
                type="button"
                onClick={() => adjustMinutes(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-600 bg-gray-700 text-white hover:bg-gray-600 transition-colors"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            {/* AM/PM - hidden in 24-hour mode */}
            {!use24Hour && (
              <div className="flex flex-col items-center space-y-2">
                <div className="h-8"></div>
                <button
                  type="button"
                  onClick={togglePeriod}
                  className="flex h-10 w-12 items-center justify-center rounded-md border border-gray-600 bg-blue-600 text-white hover:bg-blue-700 transition-colors font-semibold"
                >
                  {period}
                </button>
                <div className="h-8"></div>
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-between">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-md bg-gray-700 px-3 py-1 text-sm text-white hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

CustomTimePicker.displayName = "CustomTimePicker"

export { CustomTimePicker }
