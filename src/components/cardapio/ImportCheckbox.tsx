import type { InputHTMLAttributes } from "react"

export function ImportCheckbox(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <input
      type="checkbox"
      className="size-4 shrink-0 cursor-pointer rounded border-input accent-primary disabled:cursor-not-allowed disabled:opacity-50"
      {...props}
    />
  )
}
