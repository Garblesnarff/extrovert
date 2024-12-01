import * as React from "react"

import { forwardRef, HTMLAttributes, Children, isValidElement, cloneElement } from "react"

interface SlotProps extends HTMLAttributes<HTMLElement> {
  children?: React.ReactNode
}

const Slot = forwardRef<HTMLElement, SlotProps>(({ children, ...props }, ref) => {
  if (!isValidElement(children)) {
    return null
  }

  return cloneElement(children, {
    ...props,
    ref: ref ?? children.props.ref,
  })
})
Slot.displayName = "Slot"

export { Slot }
