import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"

describe("Dialog layering", () => {
  it("renders above portaled application modals", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>新建存档</DialogTitle>
          <DialogDescription>输入新的存档名称</DialogDescription>
        </DialogContent>
      </Dialog>,
    )

    expect(screen.getByRole("dialog")).toHaveClass("z-[100]")
    expect(document.querySelector('[data-state="open"].fixed')).toHaveClass("z-[100]")
  })
})
