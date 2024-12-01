import * as React from "react"

type SlotProps = {
  children?: React.ReactNode
} & React.HTMLAttributes<HTMLElement>

const Slot = React.forwardRef<HTMLElement, SlotProps>(({ children, ...rest }, ref) => {
  if (!React.isValidElement(children)) {
    return null
  }

  return React.cloneElement(children, {
    ...rest,
    ...children.props,
    ref: (node: HTMLElement) => {
      if (typeof ref === 'function') {
        ref(node)
      } else if (ref) {
        ref.current = node
      }
      const childRef = (children as any).ref
      if (typeof childRef === 'function') {
        childRef(node)
      } else if (childRef) {
        childRef.current = node
      }
    }
  })
})

Slot.displayName = "Slot"

export { Slot }
