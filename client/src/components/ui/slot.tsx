import * as React from "react"

type SlotProps = {
  children?: React.ReactNode
} & React.HTMLAttributes<HTMLElement>

const Slot = React.forwardRef<HTMLElement, SlotProps>((props, ref) => {
  const { children, ...rest } = props

  if (!React.isValidElement(children)) {
    return null
  }

  return React.cloneElement(children, {
    ...rest,
    ref,
  })
})

Slot.displayName = "Slot"

export { Slot }
