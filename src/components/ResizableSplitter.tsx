import { useRef, useState, useEffect } from 'react'
import { theme } from '../styles/theme'

interface ResizableSplitterProps {
  orientation: 'vertical' | 'horizontal'
  onResize: (delta: number) => void
  isMobile: boolean
}

export const ResizableSplitter: React.FC<ResizableSplitterProps> = ({
  orientation,
  onResize,
  isMobile,
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef<number>(0)

  useEffect(() => {
    if (!isDragging) return

    const handleMove = (e: MouseEvent) => {
      const current = orientation === 'vertical' ? e.clientX : e.clientY
      const delta = current - dragStart.current
      dragStart.current = current
      onResize(delta)
    }

    const handleUp = () => setIsDragging(false)

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }
  }, [isDragging, orientation, onResize])

  if (isMobile) {
    return (
      <div
        style={{
          [orientation === 'vertical' ? 'width' : 'height']: 1,
          [orientation === 'vertical' ? 'height' : 'width']: '100%',
          background: theme.border,
          flexShrink: 0,
        }}
      />
    )
  }

  const isVertical = orientation === 'vertical'

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={(e) => {
        e.preventDefault()
        dragStart.current = isVertical ? e.clientX : e.clientY
        setIsDragging(true)
      }}
      style={{
        [isVertical ? 'width' : 'height']: 4,
        [isVertical ? 'minHeight' : 'minWidth']: '100%',
        flexShrink: 0,
        background: isDragging || isHovered ? theme.splitterActive : theme.border,
        cursor: isVertical ? 'col-resize' : 'row-resize',
        transition: 'background 0.12s',
        userSelect: 'none',
        zIndex: 10,
      }}
    />
  )
}
