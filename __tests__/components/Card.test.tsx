import { render, screen } from "@testing-library/react";
import { Card } from "@/components/ui/Card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card>Hello</Card>);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("applies elevated class when elevated prop is true", () => {
    const { container } = render(<Card elevated>Content</Card>);
    expect(container.firstChild).toHaveClass("elevated");
  });
});
