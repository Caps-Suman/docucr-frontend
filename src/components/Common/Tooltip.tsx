import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  delay?: number;
  className?: string;
  preferredPosition?: TooltipPosition;
}

export const Tooltip: React.FC<TooltipProps> = ({ 
  content, 
  children, 
  delay = 200,
  className = '',
  preferredPosition = 'top'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [position, setPosition] = useState<TooltipPosition>(preferredPosition);
  
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;
    
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let newPos = preferredPosition;
    
    // Check space
    const spaceAbove = triggerRect.top;
    const spaceBelow = viewportHeight - triggerRect.bottom;
    const spaceLeft = triggerRect.left;
    const spaceRight = viewportWidth - triggerRect.right;

    // Determine actual position
    if (preferredPosition === 'top' && spaceAbove < tooltipRect.height + 10 && spaceBelow > spaceAbove) {
      newPos = 'bottom';
    } else if (preferredPosition === 'bottom' && spaceBelow < tooltipRect.height + 10 && spaceAbove > spaceBelow) {
      newPos = 'top';
    } else if (preferredPosition === 'left' && spaceLeft < tooltipRect.width + 10 && spaceRight > spaceLeft) {
      newPos = 'right';
    } else if (preferredPosition === 'right' && spaceRight < tooltipRect.width + 10 && spaceLeft > spaceRight) {
      newPos = 'left';
    }

    setPosition(newPos);

    // Calculate coordinates
    let top = 0;
    let left = 0;

    switch (newPos) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - 8;
        left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'bottom':
        top = triggerRect.bottom + 8;
        left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
        left = triggerRect.left - tooltipRect.width - 8;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
        left = triggerRect.right + 8;
        break;
    }

    // Keep within bounds horizontally
    if (newPos === 'top' || newPos === 'bottom') {
      if (left < 10) left = 10;
      if (left + tooltipRect.width > viewportWidth - 10) left = viewportWidth - tooltipRect.width - 10;
    }

    setCoords({ top, left });
  };

  const showTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    const handleResizeOrScroll = () => {
      updatePosition();
    };

    if (isVisible) {
      updatePosition();
      window.addEventListener('scroll', handleResizeOrScroll, true);
      window.addEventListener('resize', handleResizeOrScroll);
    }
    return () => {
      window.removeEventListener('scroll', handleResizeOrScroll, true);
      window.removeEventListener('resize', handleResizeOrScroll);
    };
  }, [isVisible, preferredPosition]);

  return (
    <>
      <div 
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        style={{ display: 'inline-block' }}
      >
        {children}
      </div>
      
      {isVisible && createPortal(
        <div
          ref={tooltipRef}
          className={`custom-tooltip ${className}`}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            backgroundColor: '#1e293b',
            color: 'white',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            zIndex: 99999,
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            transition: 'opacity 0.15s ease-in-out',
            opacity: coords.top !== 0 ? 1 : 0 // Prevent flicker before first calc
          }}
        >
          {content}
          
          {/* Arrow */}
          <div style={{
            position: 'absolute',
            width: 0,
            height: 0,
            borderStyle: 'solid',
            ...(position === 'top' ? {
              bottom: '-5px',
              left: '50%',
              transform: 'translateX(-50%)',
              borderWidth: '5px 5px 0 5px',
              borderColor: '#1e293b transparent transparent transparent'
            } : position === 'bottom' ? {
              top: '-5px',
              left: '50%',
              transform: 'translateX(-50%)',
              borderWidth: '0 5px 5px 5px',
              borderColor: 'transparent transparent #1e293b transparent'
            } : position === 'left' ? {
              right: '-5px',
              top: '50%',
              transform: 'translateY(-50%)',
              borderWidth: '5px 0 5px 5px',
              borderColor: 'transparent transparent transparent #1e293b'
            } : {
              left: '-5px',
              top: '50%',
              transform: 'translateY(-50%)',
              borderWidth: '5px 5px 5px 0',
              borderColor: 'transparent #1e293b transparent transparent'
            })
          }} />
        </div>,
        document.body
      )}
    </>
  );
};
